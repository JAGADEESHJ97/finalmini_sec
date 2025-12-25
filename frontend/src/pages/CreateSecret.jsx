import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Clock, Eye, EyeOff, Shield, Loader2, KeyRound, Upload, X, File, FileText, Image, FileArchive } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { encryptText, generateEncryptionKey, hashPin, encryptFile } from '../lib/crypto';
import { createSecret } from '../lib/api';

const expiryOptions = [
  { value: '10', label: '10 minutes' },
  { value: '60', label: '1 hour' },
  { value: '360', label: '6 hours' },
  { value: '1440', label: '24 hours' }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const getFileIcon = (type) => {
  if (type.startsWith('image/')) return Image;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return FileArchive;
  return File;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function CreateSecret() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [secretText, setSecretText] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('60');
  const [oneTimeView, setOneTimeView] = useState(true);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    
    // Check file count
    if (files.length + fileArray.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Check total size
    const currentSize = files.reduce((sum, f) => sum + f.size, 0);
    const newSize = fileArray.reduce((sum, f) => sum + f.size, 0);
    
    if (currentSize + newSize > MAX_FILE_SIZE) {
      toast.error(`Total file size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
      return;
    }

    setFiles(prev => [...prev, ...fileArray]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!secretText.trim() && files.length === 0) {
      toast.error('Please enter a secret or add files to share');
      return;
    }

    if (usePin && (!pin || pin.length < 4)) {
      toast.error('PIN must be at least 4 characters');
      return;
    }

    setIsCreating(true);

    try {
      // Generate encryption key
      const encryptionKey = generateEncryptionKey();
      
      // Encrypt the secret text client-side
      const { ciphertext, iv } = encryptText(secretText || ' ', encryptionKey);
      
      // Hash PIN if provided
      const pinHash = usePin ? hashPin(pin) : null;

      // Encrypt files
      let encryptedFiles = null;
      if (files.length > 0) {
        toast.info('Encrypting files...');
        encryptedFiles = await Promise.all(
          files.map(async (file) => {
            const encrypted = await encryptFile(file, encryptionKey);
            return {
              encrypted_data: encrypted.encryptedData,
              iv: encrypted.iv,
              filename: encrypted.filename,
              file_type: encrypted.fileType,
              file_size: encrypted.fileSize
            };
          })
        );
      }

      // Send encrypted data to backend
      const response = await createSecret({
        encryptedData: ciphertext,
        iv: iv,
        pinHash: pinHash,
        expiryMinutes: parseInt(expiryMinutes),
        oneTimeView: oneTimeView,
        files: encryptedFiles
      });

      // Navigate to result page with the secret ID and encryption key
      navigate('/share', {
        state: {
          secretId: response.id,
          encryptionKey: encryptionKey,
          expiryMinutes: parseInt(expiryMinutes),
          oneTimeView: oneTimeView,
          hasPin: usePin,
          hasFiles: files.length > 0,
          fileCount: files.length
        }
      });

      toast.success('Secret encrypted and stored securely');
    } catch (error) {
      console.error('Error creating secret:', error);
      if (error.response?.status === 413) {
        toast.error('Files too large. Please reduce total size.');
      } else {
        toast.error('Failed to create secret. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const totalFileSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="mb-10">
        <motion.div 
          className="flex items-center gap-3 mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-slate-100">
            Share a Secret
          </h1>
        </motion.div>
        <p className="text-slate-400 text-base sm:text-lg">
          End-to-end encrypted. Your data never leaves your device unencrypted.
        </p>
      </div>

      {/* Secret Input */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="input-wrapper">
          <div className="glass rounded-xl p-1">
            <textarea
              data-testid="secret-input"
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              placeholder="Enter your secret text here... (passwords, notes, API keys, etc.)"
              className="secret-textarea p-5 bg-transparent focus:outline-none"
              rows={5}
            />
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          {secretText.length} characters
        </p>
      </motion.div>

      {/* File Upload */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div
          data-testid="file-drop-zone"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`glass rounded-xl p-6 border-2 border-dashed cursor-pointer transition-all ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-500/5' 
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            data-testid="file-input"
          />
          <div className="text-center">
            <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragging ? 'text-emerald-400' : 'text-slate-500'}`} />
            <p className="text-slate-300 font-medium mb-1">
              Drop files here or click to upload
            </p>
            <p className="text-slate-500 text-sm">
              Max {MAX_FILES} files, {MAX_FILE_SIZE / (1024 * 1024)}MB total
            </p>
          </div>
        </div>

        {/* File List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2"
            >
              {files.map((file, index) => {
                const FileIcon = getFileIcon(file.type);
                return (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="glass rounded-lg px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-slate-200 text-sm truncate">{file.name}</p>
                        <p className="text-slate-500 text-xs">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      data-testid={`remove-file-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
              <p className="text-slate-500 text-sm text-right">
                Total: {formatFileSize(totalFileSize)} / {MAX_FILE_SIZE / (1024 * 1024)}MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Options Grid */}
      <motion.div 
        className="grid gap-6 sm:grid-cols-2 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Expiry Time */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-500" />
            Expires after
          </Label>
          <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
            <SelectTrigger 
              data-testid="expiry-select" 
              className="glass border-slate-700 text-slate-200"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {expiryOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="text-slate-200 focus:bg-slate-800 focus:text-slate-100"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* One-time View */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-slate-300">
            <Eye className="w-4 h-4 text-slate-500" />
            Self-destruct after viewing
          </Label>
          <div className="glass rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400 text-sm">
              {oneTimeView ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              data-testid="one-time-toggle"
              checked={oneTimeView}
              onCheckedChange={setOneTimeView}
            />
          </div>
        </div>
      </motion.div>

      {/* PIN Protection */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <Label className="flex items-center gap-2 text-slate-300">
              <KeyRound className="w-4 h-4 text-slate-500" />
              PIN Protection (Optional)
            </Label>
            <Switch
              data-testid="pin-toggle"
              checked={usePin}
              onCheckedChange={setUsePin}
            />
          </div>
          
          {usePin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative"
            >
              <Input
                data-testid="pin-input"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter a PIN (min 4 characters)"
                className="bg-slate-900/50 border-slate-700 text-slate-200 pr-10 pin-input"
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </motion.div>
          )}
          
          <p className="text-slate-500 text-sm mt-3">
            Recipient must enter this PIN to view the secret
          </p>
        </div>
      </motion.div>

      {/* Create Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          data-testid="create-btn"
          onClick={handleCreate}
          disabled={isCreating || (!secretText.trim() && files.length === 0)}
          className="w-full h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg btn-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Encrypting...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              Create Secure Link
            </>
          )}
        </Button>
      </motion.div>

      {/* Security Note */}
      <motion.p 
        className="text-center text-slate-500 text-sm mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Your secret and files are encrypted in your browser before being sent to our servers.
        <br />
        We never see your unencrypted data.
      </motion.p>
    </motion.div>
  );
}
