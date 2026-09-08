export default function MemeModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel meme-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-drag-handle" aria-hidden="true" />
        <p className="meme-modal-title">¡Sesión completada! 🥊</p>
        <img className="meme-modal-image" src={src} alt="Meme de celebración" />
        <button className="meme-modal-close" onClick={onClose}>
          Seguir
        </button>
      </div>
    </div>
  );
}
