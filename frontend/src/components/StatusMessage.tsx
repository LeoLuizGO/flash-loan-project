import React from 'react';

interface StatusMessageProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  message,
  type,
  onClose,
}) => {
  if (!message) return null;

  const icons = {
    success: '&#x2705;',
    error: '&#x274C;',
    info: '&#x2139;',
    warning: '&#x26A0;',
  };

  return (
    <div className={`status-message ${type}`}>
      <span dangerouslySetInnerHTML={{ __html: icons[type] }} style={{ fontSize: '1.25rem' }} />
      <div style={{ flex: 1 }}>
        <p>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0.25rem',
            fontSize: '1.25rem',
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default StatusMessage;
