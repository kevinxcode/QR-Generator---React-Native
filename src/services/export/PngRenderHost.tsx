import { useEffect, useRef, useState } from 'react';
import { PixelRatio, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface Job {
  svg: string;
  width: number;
  height: number;
  resolve(base64: string): void;
  reject(e: Error): void;
}

let enqueue: ((job: Job) => void) | null = null;

/**
 * Rasterise an SVG string to PNG (base64) at an exact pixel size, fully offline,
 * using react-native-svg's native renderer. Requires <PngRenderHost/> to be mounted.
 */
export function renderSvgToPng(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!enqueue) {
      reject(new Error('Renderer not ready'));
      return;
    }
    enqueue({ svg, width: Math.round(width), height: Math.round(height), resolve, reject });
  });
}

type SvgHandle = { toDataURL(cb: (b64: string) => void, options?: object): void };

/** Hidden, off-screen host that lays out the SVG at the target pixel size and captures it. */
export function PngRenderHost() {
  const [job, setJob] = useState<Job | null>(null);
  const queue = useRef<Job[]>([]);
  const ref = useRef<SvgHandle>(null);

  useEffect(() => {
    enqueue = (j) => {
      queue.current.push(j);
      setJob((cur) => cur ?? queue.current.shift() ?? null);
    };
    return () => {
      enqueue = null;
    };
  }, []);

  const next = () => setJob(queue.current.shift() ?? null);

  const capture = () => {
    const current = job;
    if (!current) return;
    // Give the native view one frame to draw after layout.
    requestAnimationFrame(() => {
      const timeout = setTimeout(() => {
        current.reject(new Error('Image rendering timed out.'));
        next();
      }, 15000);
      try {
        ref.current?.toDataURL((b64) => {
          clearTimeout(timeout);
          current.resolve(b64);
          next();
        });
      } catch (e) {
        clearTimeout(timeout);
        current.reject(e instanceof Error ? e : new Error(String(e)));
        next();
      }
    });
  };

  if (!job) return null;
  const ratio = PixelRatio.get();
  const w = job.width / ratio;
  const h = job.height / ratio;
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ position: 'absolute', left: -w - 1000, top: 0, width: w, height: h, opacity: 0 }}
    >
      <SvgXml
        key={`${job.svg.length}-${job.width}-${job.height}`}
        // @ts-expect-error React 19 forwards `ref` as a prop to the underlying <Svg/>
        ref={ref}
        xml={job.svg}
        width={w}
        height={h}
        onLayout={capture}
      />
    </View>
  );
}
