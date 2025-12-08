'use client';

import { useState, useCallback } from 'react';
import { Share2, Check, Copy, Twitter, Facebook, Link2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useToast } from './Toast';

// ==========================================================================
// Share Button Component
// Uses Web Share API with fallback to ShareModal
// ==========================================================================

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  variant?: 'hero' | 'default' | 'icon';
  className?: string;
}

export function ShareButton({
  title,
  text,
  url,
  variant = 'default',
  className = '',
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  const handleShare = useCallback(async () => {
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || `Check out ${title} on FlickPick`,
          url,
        });
      } catch (error) {
        // User cancelled share or error occurred
        if ((error as Error).name !== 'AbortError') {
          // Fallback to modal if share fails (not cancelled)
          setIsModalOpen(true);
        }
      }
    } else {
      // Fallback to modal for browsers without Web Share API
      setIsModalOpen(true);
    }
  }, [title, text, url]);

  // Variant styles
  const variantStyles = {
    hero: 'inline-flex items-center gap-1.5 rounded-lg border border-text-primary/30 bg-text-primary/10 px-4 py-2 text-sm font-semibold text-text-primary backdrop-blur-sm transition-all hover:bg-text-primary/20 sm:gap-2 sm:px-6 sm:py-3 sm:text-base',
    default:
      'inline-flex items-center gap-2 rounded-lg bg-bg-tertiary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-border-default',
    icon: 'rounded-full p-2 text-text-tertiary transition-all hover:bg-bg-tertiary hover:text-text-primary',
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={`${variantStyles[variant]} ${className}`}
        aria-label={`Share ${title}`}
      >
        <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
        {variant !== 'icon' && <span>Share</span>}
      </button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        text={text}
        url={url}
        onSuccess={() => {
          addToast({
            type: 'success',
            title: 'Link copied!',
            message: 'Share link has been copied to clipboard',
            duration: 3000,
          });
        }}
      />
    </>
  );
}

// ==========================================================================
// Share Modal Component
// Fallback for browsers without Web Share API
// ==========================================================================

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  url: string;
  onSuccess?: () => void;
}

export function ShareModal({
  isOpen,
  onClose,
  title,
  text,
  url,
  onSuccess,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onSuccess?.();

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      onSuccess?.();
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url, onSuccess]);

  const shareText = encodeURIComponent(text || `Check out ${title} on FlickPick`);
  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);

  const socialLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      color: 'hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`,
      color: 'hover:bg-[#4267B2]/20 hover:text-[#4267B2]',
    },
    {
      name: 'Reddit',
      icon: RedditIcon,
      url: `https://www.reddit.com/submit?url=${shareUrl}&title=${shareTitle}`,
      color: 'hover:bg-[#FF4500]/20 hover:text-[#FF4500]',
    },
    {
      name: 'WhatsApp',
      icon: WhatsAppIcon,
      url: `https://wa.me/?text=${shareText}%20${shareUrl}`,
      color: 'hover:bg-[#25D366]/20 hover:text-[#25D366]',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share"
      description={`Share "${title}" with friends`}
      size="sm"
    >
      <div className="space-y-6">
        {/* Copy Link Section */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Copy Link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-lg bg-bg-tertiary px-4 py-3 border border-border-subtle">
              <Link2 className="h-4 w-4 text-text-tertiary flex-shrink-0" />
              <span className="truncate text-sm text-text-secondary">{url}</span>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopyLink}
              className="flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Social Share Options */}
        <div>
          <label className="mb-3 block text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Share on Social
          </label>
          <div className="grid grid-cols-2 gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 rounded-lg bg-bg-tertiary px-4 py-3 text-sm font-medium text-text-primary transition-colors ${social.color}`}
                onClick={() => onClose()}
              >
                <social.icon className="h-5 w-5" />
                {social.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ==========================================================================
// Custom Social Icons (not available in Lucide)
// ==========================================================================

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
