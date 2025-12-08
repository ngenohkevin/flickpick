// ==========================================================================
// Import Watchlist Modal
// Modal for importing watchlist from JSON file with merge options
// ==========================================================================

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, AlertCircle, CheckCircle, FileJson, Replace, Merge, RefreshCw } from 'lucide-react';
import { useWatchlist, validateWatchlistExport, type ImportMode, type WatchlistExport, type ImportResult } from '@/stores/watchlist';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface ImportWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStep = 'select' | 'preview' | 'result';

// ==========================================================================
// Component
// ==========================================================================

export function ImportWatchlistModal({ isOpen, onClose }: ImportWatchlistModalProps) {
  const [step, setStep] = useState<ImportStep>('select');
  const [importData, setImportData] = useState<WatchlistExport | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge_skip');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importWatchlist = useWatchlist((state) => state.importWatchlist);
  const currentItemCount = useWatchlist((state) => state.items.length);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStep('select');
    setImportData(null);
    setImportMode('merge_skip');
    setError(null);
    setResult(null);
    setIsDragging(false);
    onClose();
  }, [onClose]);

  // Process selected file
  const processFile = useCallback(async (file: File) => {
    setError(null);

    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const validation = validateWatchlistExport(data);

      if (!validation.valid || !validation.data) {
        setError(validation.error || 'Invalid file format');
        return;
      }

      setImportData(validation.data);
      setStep('preview');
    } catch {
      setError('Failed to read file. Please ensure it\'s a valid JSON file.');
    }
  }, []);

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  // Handle import
  const handleImport = useCallback(() => {
    if (!importData) return;

    const importResult = importWatchlist(importData, importMode);
    setResult(importResult);
    setStep('result');
  }, [importData, importMode, importWatchlist]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg bg-bg-elevated shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Import Watchlist</h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Step 1: Select File */}
          {step === 'select' && (
            <div>
              <p className="mb-4 text-sm text-text-secondary">
                Select a FlickPick watchlist export file (.json) to import.
              </p>

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                  isDragging
                    ? 'border-accent-primary bg-accent-primary/5'
                    : 'border-border-default hover:border-border-strong'
                )}
              >
                <FileJson className="mb-3 h-12 w-12 text-text-tertiary" />
                <p className="mb-2 text-center text-text-primary">
                  Drag and drop your file here
                </p>
                <p className="mb-4 text-sm text-text-tertiary">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-md bg-error/10 px-4 py-3 text-error">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview & Options */}
          {step === 'preview' && importData && (
            <div>
              {/* Preview Info */}
              <div className="mb-6 rounded-lg bg-bg-secondary p-4">
                <div className="flex items-center gap-3">
                  <FileJson className="h-10 w-10 text-accent-primary" />
                  <div>
                    <p className="font-medium text-text-primary">
                      {importData.items.length} items to import
                    </p>
                    <p className="text-sm text-text-tertiary">
                      Exported {new Date(importData.exported_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current State */}
              {currentItemCount > 0 && (
                <p className="mb-4 text-sm text-text-secondary">
                  Your current watchlist has {currentItemCount} items.
                </p>
              )}

              {/* Import Mode Selection */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-text-primary">Import mode:</p>

                <ImportModeOption
                  mode="merge_skip"
                  currentMode={importMode}
                  onSelect={setImportMode}
                  icon={<Merge className="h-5 w-5" />}
                  title="Merge (skip duplicates)"
                  description="Add new items, keep existing items unchanged"
                />

                <ImportModeOption
                  mode="merge_update"
                  currentMode={importMode}
                  onSelect={setImportMode}
                  icon={<RefreshCw className="h-5 w-5" />}
                  title="Merge (update duplicates)"
                  description="Add new items, update existing items with imported data"
                />

                <ImportModeOption
                  mode="replace"
                  currentMode={importMode}
                  onSelect={setImportMode}
                  icon={<Replace className="h-5 w-5" />}
                  title="Replace all"
                  description="Remove current watchlist and replace with imported items"
                />
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 'result' && result && (
            <div>
              {result.success ? (
                <div className="flex flex-col items-center py-4">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-text-primary">
                    Import Complete
                  </h3>
                  <div className="space-y-1 text-center text-sm text-text-secondary">
                    {result.imported > 0 && (
                      <p>{result.imported} items imported</p>
                    )}
                    {result.updated > 0 && (
                      <p>{result.updated} items updated</p>
                    )}
                    {result.skipped > 0 && (
                      <p>{result.skipped} items skipped</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
                    <AlertCircle className="h-8 w-8 text-error" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-text-primary">
                    Import Failed
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {result.errors[0] || 'An unknown error occurred'}
                  </p>
                </div>
              )}

              {/* Errors/Warnings */}
              {result.errors.length > 0 && result.success && (
                <div className="mt-4 rounded-md bg-warning/10 p-3">
                  <p className="mb-2 text-sm font-medium text-warning">
                    {result.errors.length} warning(s):
                  </p>
                  <ul className="max-h-32 overflow-y-auto text-xs text-text-secondary">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="truncate">{err}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>...and {result.errors.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border-subtle px-6 py-4">
          {step === 'select' && (
            <button
              onClick={handleClose}
              className="rounded-md px-4 py-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            >
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setStep('select');
                  setImportData(null);
                  setError(null);
                }}
                className="rounded-md px-4 py-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover"
              >
                <Upload className="h-4 w-4" />
                Import
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={handleClose}
              className="rounded-md bg-accent-primary px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Import Mode Option Component
// ==========================================================================

interface ImportModeOptionProps {
  mode: ImportMode;
  currentMode: ImportMode;
  onSelect: (mode: ImportMode) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ImportModeOption({
  mode,
  currentMode,
  onSelect,
  icon,
  title,
  description,
}: ImportModeOptionProps) {
  const isSelected = mode === currentMode;

  return (
    <button
      onClick={() => onSelect(mode)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all',
        isSelected
          ? 'border-accent-primary bg-accent-primary/5'
          : 'border-border-default hover:border-border-strong hover:bg-bg-tertiary'
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex-shrink-0',
          isSelected ? 'text-accent-primary' : 'text-text-tertiary'
        )}
      >
        {icon}
      </div>
      <div>
        <p
          className={cn(
            'font-medium',
            isSelected ? 'text-accent-primary' : 'text-text-primary'
          )}
        >
          {title}
        </p>
        <p className="text-sm text-text-tertiary">{description}</p>
      </div>
      <div className="ml-auto mt-0.5">
        <div
          className={cn(
            'h-5 w-5 rounded-full border-2 transition-colors',
            isSelected
              ? 'border-accent-primary bg-accent-primary'
              : 'border-border-strong'
          )}
        >
          {isSelected && (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
