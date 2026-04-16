import { useEffect, useRef, useState } from 'react';
import { getIslandModel, sectionIcons } from '../lib/expandableIsland.js';

export default function ExpandableIsland({ sections }) {
  const islandRef = useRef(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!islandRef.current?.contains(event.target) || !event.target.closest('.floating-button-group')) {
        setActive(null);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const currentModel = getIslandModel(active);

  const handleToggleSection = (id) => {
    setActive((current) => (current === id ? null : id));
  };

  const renderSection = (section, right = false) => {
    const { id, data } = section;
    const dialogClass = right ? 'side-dialog right-dialog' : 'side-dialog';
    const isOpen = active === id;

    return (
      <div className="floating-button-group" key={id}>
        <button
          className="side-button"
          type="button"
          aria-label={data.title}
          aria-expanded={isOpen}
          aria-controls={`${id}-panel`}
          onClick={() => handleToggleSection(id)}
        >
          <span className="icon">{sectionIcons[id] ?? '•'}</span>
        </button>
        <div id={`${id}-panel`} className={dialogClass} role="region">
          <h4>{data.title}</h4>
          <p>{data.summary}</p>
          {data.details.map((item) => (
            <div key={`${id}-${item.heading}`}>
              <h4>{item.heading}</h4>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const leftButtons = sections.slice(0, 4);
  const rightButtons = sections.slice(4);

  return (
    <div className="content-with-buttons interactive-island" ref={islandRef}>
      <div className="side-buttons left-buttons">
        {leftButtons.map((section) => renderSection(section))}
      </div>

      <div className="sketchfab-embed-wrapper">
        <iframe
          title={currentModel.title}
          frameBorder="0"
          allowFullScreen
          mozAllowFullScreen="true"
          webkitAllowFullScreen="true"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          xr-spatial-tracking
          execution-while-out-of-viewport
          execution-while-not-rendered
          web-share
          src={currentModel.src}
        />
        <p className="sketchfab-credit">
          <a
            href={currentModel.modelUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            {currentModel.label}
          </a>{' '}
          by{' '}
          <a
            href={currentModel.authorUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            {currentModel.author}
          </a>{' '}
          on{' '}
          <a
            href="https://sketchfab.com?utm_medium=embed&utm_campaign=share-popup&utm_content=05836e1c71bb4ff3a423f59825c1764d"
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            Sketchfab
          </a>
        </p>
      </div>

      <div className="side-buttons right-buttons">
        {rightButtons.map((section) => renderSection(section, true))}
      </div>
    </div>
  );
}
