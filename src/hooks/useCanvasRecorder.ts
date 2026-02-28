import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { RenderPass } from '../App';

function pickMimeType(): string {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useCanvasRecorder(renderPass: RenderPass): void {
  const { gl } = useThree();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]); // Use a ref for chunks

  useEffect(() => {
    if (renderPass !== 'idle') {
      startRecording(renderPass);
    } else {
      stopRecording();
    }

    // Cleanup function to ensure we don't leave recorders hanging
    return () => stopRecording();
  }, [renderPass]);

  function startRecording(passName: RenderPass): void {
    const canvas = gl.domElement;
    const mimeType = pickMimeType();
    
    // 1. Clear previous chunks
    chunksRef.current = []; 

    const stream = canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      
      // 2. Stop all tracks to "kill" the stream properly
      stream.getTracks().forEach(track => track.stop());

      if (blob.size === 0) return;
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      downloadBlob(blob, `render-${passName}-${Date.now()}.${ext}`);
    };

    recorder.start();
    recorderRef.current = recorder;
  }

  function stopRecording(): void {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
  }
}
