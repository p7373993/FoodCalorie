/**
 * 프론트엔드 성능 모니터링 유틸리티
 */

// 성능 메트릭 타입
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url?: string;
  userAgent?: string;
}

// 웹 바이탈 메트릭
interface WebVitals {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private webVitals: WebVitals = {};

  constructor() {
    this.initializeObservers();
    this.measureWebVitals();
  }

  /**
   * 성능 옵저버 초기화
   */
  private initializeObservers() {
    // Navigation Timing 관찰
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordNavigationMetrics(entry as PerformanceNavigationTiming);
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error);
      }

      // Resource Timing 관찰
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              this.recordResourceMetric(entry as PerformanceResourceTiming);
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported:', error);
      }

      // Long Task 관찰
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('long-task', entry.duration, entry.startTime);
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  /**
   * 웹 바이탈 측정
   */
  private measureWebVitals() {
    // FCP (First Contentful Paint)
    this.measureFCP();
    
    // LCP (Largest Contentful Paint)
    this.measureLCP();
    
    // FID (First Input Delay)
    this.measureFID();
    
    // CLS (Cumulative Layout Shift)
    this.measureCLS();
    
    // TTFB (Time to First Byte)
    this.measureTTFB();
  }

  private measureFCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.webVitals.FCP = entry.startTime;
              this.recordMetric('FCP', entry.startTime);
              observer.disconnect();
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('FCP measurement not supported:', error);
      }
    }
  }

  private measureLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.webVitals.LCP = lastEntry.startTime;
          this.recordMetric('LCP', lastEntry.startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP measurement not supported:', error);
      }
    }
  }

  private measureFID() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'first-input') {
              const fid = (entry as any).processingStart - entry.startTime;
              this.webVitals.FID = fid;
              this.recordMetric('FID', fid);
              observer.disconnect();
            }
          }
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID measurement not supported:', error);
      }
    }
  }

  private measureCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.webVitals.CLS = clsValue;
          this.recordMetric('CLS', clsValue);
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS measurement not supported:', error);
      }
    }
  }

  private measureTTFB() {
    if (performance.timing) {
      const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      this.webVitals.TTFB = ttfb;
      this.recordMetric('TTFB', ttfb);
    }
  }

  /**
   * 네비게이션 메트릭 기록
   */
  private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics = {
      'dns-lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'tcp-connect': entry.connectEnd - entry.connectStart,
      'ssl-handshake': entry.connectEnd - entry.secureConnectionStart,
      'request': entry.responseStart - entry.requestStart,
      'response': entry.responseEnd - entry.responseStart,
      'dom-processing': entry.domComplete - entry.domLoading,
      'load-complete': entry.loadEventEnd - entry.loadEventStart,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.recordMetric(name, value);
      }
    });
  }

  /**
   * 리소스 메트릭 기록
   */
  private recordResourceMetric(entry: PerformanceResourceTiming) {
    const duration = entry.responseEnd - entry.startTime;
    const resourceType = this.getResourceType(entry.name);
    
    this.recordMetric(`resource-${resourceType}`, duration, entry.startTime, entry.name);
    
    // 큰 리소스 경고
    if (duration > 1000) {
      console.warn(`Slow resource loading: ${entry.name} took ${duration}ms`);
    }
  }

  /**
   * 리소스 타입 추출
   */
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['js', 'jsx', 'ts', 'tsx'].includes(extension || '')) return 'script';
    if (['css', 'scss', 'sass'].includes(extension || '')) return 'stylesheet';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension || '')) return 'font';
    
    return 'other';
  }

  /**
   * 메트릭 기록
   */
  private recordMetric(name: string, value: number, timestamp?: number, url?: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: timestamp || Date.now(),
      url,
      userAgent: navigator.userAgent,
    };

    this.metrics.push(metric);
    
    // 콘솔에 중요한 메트릭 출력
    if (['FCP', 'LCP', 'FID', 'CLS', 'TTFB'].includes(name)) {
      console.log(`${name}: ${value.toFixed(2)}ms`);
    }
  }

  /**
   * 커스텀 메트릭 측정
   */
  public measureCustom(name: string, fn: () => void | Promise<void>): Promise<number> {
    const start = performance.now();
    
    const result = fn();
    
    if (result instanceof Promise) {
      return result.then(() => {
        const duration = performance.now() - start;
        this.recordMetric(name, duration);
        return duration;
      });
    } else {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return Promise.resolve(duration);
    }
  }

  /**
   * 컴포넌트 렌더링 시간 측정
   */
  public measureRender(componentName: string) {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(`render-${componentName}`, duration);
      
      if (duration > 16) { // 60fps 기준
        console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  /**
   * API 호출 시간 측정
   */
  public measureAPI(url: string, method: string = 'GET') {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(`api-${method.toLowerCase()}`, duration, start, url);
      
      if (duration > 1000) {
        console.warn(`Slow API call: ${method} ${url} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  /**
   * 메모리 사용량 측정
   */
  public measureMemory(): any {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * 모든 메트릭 조회
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 웹 바이탈 조회
   */
  public getWebVitals(): WebVitals {
    return { ...this.webVitals };
  }

  /**
   * 성능 리포트 생성
   */
  public generateReport(): any {
    const memory = this.measureMemory();
    
    return {
      webVitals: this.webVitals,
      metrics: this.metrics,
      memory,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * 성능 데이터 서버로 전송
   */
  public async sendToServer(endpoint: string = '/api/performance') {
    const report = this.generateReport();
    
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.warn('Failed to send performance data:', error);
    }
  }

  /**
   * 정리
   */
  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

// 전역 성능 모니터 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// React 컴포넌트용 성능 측정 훅
export function usePerformanceMonitor() {
  const measureRender = React.useCallback((componentName: string) => {
    return performanceMonitor.measureRender(componentName);
  }, []);

  const measureCustom = React.useCallback((name: string, fn: () => void | Promise<void>) => {
    return performanceMonitor.measureCustom(name, fn);
  }, []);

  const measureAPI = React.useCallback((url: string, method: string = 'GET') => {
    return performanceMonitor.measureAPI(url, method);
  }, []);

  return {
    measureRender,
    measureCustom,
    measureAPI,
    getMetrics: () => performanceMonitor.getMetrics(),
    getWebVitals: () => performanceMonitor.getWebVitals(),
  };
}

// 성능 측정 데코레이터
export function withPerformanceMonitoring<T extends React.ComponentType<any>>(
  Component: T,
  componentName?: string
): T {
  const WrappedComponent = React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const endMeasure = React.useMemo(() => {
      return performanceMonitor.measureRender(componentName || Component.displayName || Component.name);
    }, []);

    React.useEffect(() => {
      return endMeasure;
    });

    return React.createElement(Component, { ...props, ref });
  });

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName || Component.displayName || Component.name})`;

  return WrappedComponent as T;
}

export default PerformanceMonitor;