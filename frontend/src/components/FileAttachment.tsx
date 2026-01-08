import React, { useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';

interface FileAttachmentProps {
  label?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  multiple?: boolean;
  className?: string;
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({
  label = 'Attach File',
  value,
  onChange,
  accept,
  maxSizeMB = 10,
  required = false,
  disabled = false,
  helperText,
  multiple = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      onChange(null);
      return;
    }

    const file = files[0];
    
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onChange(null);
      return;
    }

    setError(null);
    onChange(file);
  };

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onChange(null);
    setError(null);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {value ? (
        <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {value.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(value.size)}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex-shrink-0 ml-3 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <label
          onClick={handleClick}
          className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
            disabled
              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60'
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-gray-800'
          }`}
        >
          <Upload
            className={`w-6 h-6 mb-2 ${
              disabled
                ? 'text-gray-300 dark:text-gray-600'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          />
          <span
            className={`text-sm ${
              disabled
                ? 'text-gray-400 dark:text-gray-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {disabled ? 'File upload disabled' : 'Drag and drop a file, or click to select'}
          </span>
          {!disabled && (
            <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Max size: {maxSizeMB}MB
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            onChange={handleFileSelect}
            disabled={disabled}
            required={required && !value}
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default FileAttachment;







