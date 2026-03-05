import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { RenderPass } from '../App';
import { useEditorStore } from '../store/useEditorStore';

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
  const abortRef = useRef<AbortController | null>(null);

  const renderStatus = useEditorStore(s => s.renderStatus);

  // Abort any in-flight upload when renderStatus is reset to idle externally (cancel)
  useEffect(() => {
    if (renderStatus === 'idle' && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [renderStatus]);

  useEffect(() => {
    if (renderPass !== 'idle') {
      startRecording();
    } else {
      stopRecording();
    }

    return () => stopRecording();
  }, [renderPass]);

  function startRecording(): void {
    const canvas = gl.domElement;
    const mimeType = pickMimeType();

    const chunks: Blob[] = [];

    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());

      const depthBlob = new Blob(chunks, { type: mimeType });
      if (depthBlob.size === 0) return;

      // Only upload if not cancelled
      const { renderStatus: status } = useEditorStore.getState();
      if (status !== 'rendering') return;

      console.log('[recorder] depth blob:', URL.createObjectURL(depthBlob));
      uploadRender(depthBlob, mimeType);
    };

    recorder.start();
    recorderRef.current = recorder;
  }

  async function uploadRender(depthBlob: Blob, mimeType: string): Promise<void> {
    const store = useEditorStore.getState();
    store.setRenderStatus('uploading');

    const controller = new AbortController();
    abortRef.current = controller;

    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const form = new FormData();
    form.append('depth', depthBlob, `depth.${ext}`);

    try {
      const res = await fetch('http://192.168.50.124:8000/render', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const resultBlob = await res.blob();
      console.log('[recorder] result blob:', URL.createObjectURL(resultBlob));
      downloadBlob(resultBlob, `sim-to-real-${Date.now()}.mp4`);
      useEditorStore.getState().setRenderStatus('idle');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      console.error('Upload failed', e);
      useEditorStore.getState().setRenderStatus('error');
    } finally {
      abortRef.current = null;
    }
  }

  function stopRecording(): void {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
  }
}
