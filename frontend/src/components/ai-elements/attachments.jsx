import React from 'react';

export function Attachments({ variant = 'grid', className = '', children, ...props }) {
  return <div className={`attachments attachments-${variant} ${className}`} {...props}>{children}</div>;
}

export function Attachment({ data, onRemove, children, className = '' }) {
  return <article className={`attachment attachment-${data?.mediaType?.startsWith('image/') ? 'image' : 'file'} ${className}`} title={data?.filename}>
    {children || <><AttachmentPreview /><AttachmentInfo /><AttachmentRemove onClick={onRemove} /></>}
  </article>;
}

export function AttachmentPreview({ data, className = '' }) {
  const image = data?.mediaType?.startsWith('image/');
  return <span className={`attachment-preview ${className}`}>
    {image ? <img src={data.url} alt={data.filename || 'Imagem anexada'} /> : <span aria-hidden="true">{data?.mediaType === 'application/pdf' ? 'PDF' : 'ARQ'}</span>}
  </span>;
}

export function AttachmentInfo({ data, showMediaType = false }) {
  return <span className="attachment-info"><strong>{data?.filename || 'Arquivo'}</strong>{showMediaType && <small>{data?.mediaType}</small>}</span>;
}

export function AttachmentRemove({ onClick, label = 'Remover anexo' }) {
  return <button className="attachment-remove" type="button" aria-label={label} title={label} onClick={onClick}>×</button>;
}
