import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, LogOut } from 'lucide-react';
import { PixelAvatar } from './PixelAvatar.jsx';

export function ProfileMenu({ user, onExportAll, onLogout, exporting }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Open account menu for ${user.name}`}
        className="profile-trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <PixelAvatar size={28} value={user.email} />
        <span>{user.name.split(' ')[0]}</span>
        <ChevronDown size={15} />
      </button>

      {open && (
        <section aria-label="Account" className="profile-popover" role="dialog">
          <div className="profile-popover__identity">
            <PixelAvatar size={42} value={user.email} />
            <div><strong>{user.name}</strong><span>{user.email}</span></div>
          </div>
          <div className="profile-popover__actions">
            <button disabled={exporting} type="button" onClick={onExportAll}>
              <Download size={17} /><span>{exporting ? 'Preparing history…' : 'Export all history'}</span>
            </button>
            <button type="button" onClick={onLogout}>
              <LogOut size={17} /><span>Log out</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
