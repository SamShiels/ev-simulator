import { useEditorStore } from '../store/useEditorStore';
import { Button } from '../components/ui/button';

function statusLabel(renderPass: string, renderStatus: string): string {
  if (renderPass === 'rgb') return 'Rendering RGB pass…';
  if (renderPass === 'depth') return 'Rendering depth pass…';
  if (renderStatus === 'uploading') return 'Uploading to ComfyUI…';
  if (renderStatus === 'error') return 'Upload failed';
  return '';
}

export default function RenderOverlay() {
  const renderPass = useEditorStore(s => s.renderPass);
  const renderStatus = useEditorStore(s => s.renderStatus);
  const cancelRender = useEditorStore(s => s.cancelRender);
  const setRenderStatus = useEditorStore(s => s.setRenderStatus);

  if (renderStatus === 'idle') return null;

  const label = statusLabel(renderPass, renderStatus);
  const isError = renderStatus === 'error';

  function handleCancel(): void {
    cancelRender();
  }

  function handleDismiss(): void {
    setRenderStatus('idle');
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <p className="text-white text-sm font-medium mb-4">{label}</p>
      {isError ? (
        <Button variant="outline" onClick={handleDismiss}>Dismiss</Button>
      ) : (
        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
      )}
    </div>
  );
}
