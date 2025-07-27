/**
 * 최적화된 이미지 컴포넌트
 */

import React, { useState, useCallback, memo } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

// 기본 블러 데이터 URL (1x1 투명 픽셀)
const DEFAULT_BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

// 이미지 크기별 최적화 설정
const SIZE_CONFIGS = {
  thumbnail: { width: 150, height: 150, quality: 75 },
  small: { width: 300, height: 300, quality: 80 },
  medium: { width: 600, height: 400, quality: 85 },
  large: { width: 1200, height: 800, quality: 90 },
} as const;

// 반응형 이미지 sizes 설정
const RESPONSIVE_SIZES = {
  thumbnail: '150px',
  small: '(max-width: 768px) 100vw, 300px',
  medium: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px',
  large: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px',
} as const;

export const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'blur',
  blurDataURL = DEFAULT_BLUR_DATA_URL,
  sizes,
  quality = 85,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  // 에러 상태 렌더링
  if (hasError) {
    return (
      <div 
        className={`
          flex items-center justify-center bg-gray-200 text-gray-500
          ${className}
        `}
        style={{ width, height }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* 로딩 스피너 */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10"
          style={{ width, height }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// 프리셋 이미지 컴포넌트들
export const ThumbnailImage: React.FC<Omit<OptimizedImageProps, 'width' | 'height' | 'sizes'>> = memo((props) => (
  <OptimizedImage
    {...props}
    {...SIZE_CONFIGS.thumbnail}
    sizes={RESPONSIVE_SIZES.thumbnail}
  />
));

export const SmallImage: React.FC<Omit<OptimizedImageProps, 'width' | 'height' | 'sizes'>> = memo((props) => (
  <OptimizedImage
    {...props}
    {...SIZE_CONFIGS.small}
    sizes={RESPONSIVE_SIZES.small}
  />
));

export const MediumImage: React.FC<Omit<OptimizedImageProps, 'width' | 'height' | 'sizes'>> = memo((props) => (
  <OptimizedImage
    {...props}
    {...SIZE_CONFIGS.medium}
    sizes={RESPONSIVE_SIZES.medium}
  />
));

export const LargeImage: React.FC<Omit<OptimizedImageProps, 'width' | 'height' | 'sizes'>> = memo((props) => (
  <OptimizedImage
    {...props}
    {...SIZE_CONFIGS.large}
    sizes={RESPONSIVE_SIZES.large}
  />
));

// 지연 로딩 이미지 컴포넌트
export const LazyImage: React.FC<OptimizedImageProps> = memo((props) => {
  const [isInView, setIsInView] = useState(false);
  const imgRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={props.className}>
      {isInView ? (
        <OptimizedImage {...props} />
      ) : (
        <div 
          className="bg-gray-200 animate-pulse"
          style={{ width: props.width, height: props.height }}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

// 이미지 프리로더 유틸리티
export class ImagePreloader {
  private static cache = new Set<string>();

  static preload(src: string): Promise<void> {
    if (this.cache.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        this.cache.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  static preloadMultiple(srcs: string[]): Promise<void[]> {
    return Promise.all(srcs.map(src => this.preload(src)));
  }

  static isPreloaded(src: string): boolean {
    return this.cache.has(src);
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

// 이미지 최적화 훅
export function useImageOptimization() {
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  const preloadImage = useCallback(async (src: string) => {
    try {
      await ImagePreloader.preload(src);
      setPreloadedImages(prev => new Set(prev).add(src));
    } catch (error) {
      console.warn('Failed to preload image:', src, error);
    }
  }, []);

  const preloadImages = useCallback(async (srcs: string[]) => {
    try {
      await ImagePreloader.preloadMultiple(srcs);
      setPreloadedImages(prev => {
        const newSet = new Set(prev);
        srcs.forEach(src => newSet.add(src));
        return newSet;
      });
    } catch (error) {
      console.warn('Failed to preload images:', error);
    }
  }, []);

  const isPreloaded = useCallback((src: string) => {
    return preloadedImages.has(src);
  }, [preloadedImages]);

  return {
    preloadImage,
    preloadImages,
    isPreloaded,
  };
}

export default OptimizedImage;