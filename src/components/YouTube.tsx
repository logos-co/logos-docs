import React from 'react';

interface YouTubeProps {
  id: string;
  title: string;
}

export default function YouTube({id, title}: YouTubeProps): React.ReactElement {
  return (
    <div style={{position: 'relative', paddingBottom: '56.25%', height: 0}}>
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
