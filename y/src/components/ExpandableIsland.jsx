import { useEffect, useRef, useState } from 'react';

const iconMap = {
  'base-do-jogo': 'ᖭ༏ᖫ',
  ideia: '📖',
  bts: '💀',
  mundo: '🌍',
  'bebes-bbs': '👶',
  'trilha-sonora': '🎵',
  multijogador: '🌐',
  entregas: '📦',
};

export default function ExpandableIsland({ sections }) {
  const islandRef = useRef(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!islandRef.current?.contains(event.target)) {
        setActive(null);
        return;
      }

      if (!event.target.closest('.floating-button-group')) {
        setActive(null);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  const defaultModel = {
    title: 'Death Stranding Sam Standing',
    src: 'https://sketchfab.com/models/05836e1c71bb4ff3a423f59825c1764d/embed?autospin=1&autostart=1&preload=1&transparent=1',
    label: 'Death Stranding Sam Standing',
    author: 'FacFox',
    authorUrl: 'https://sketchfab.com/michaeledi?utm_medium=embed&utm_campaign=share-popup&utm_content=05836e1c71bb4ff3a423f59825c1764d',
    modelUrl: 'https://sketchfab.com/3d-models/death-stranding-sam-standing-05836e1c71bb4ff3a423f59825c1764d?utm_medium=embed&utm_campaign=share-popup&utm_content=05836e1c71bb4ff3a423f59825c1764d',
  };

  const btsModel = {
    title: 'Death Stranding Sam',
    src: 'https://sketchfab.com/models/e38963c8dfed48a6bfad2effa41ae3ff/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_hint=0',
    label: 'Death Stranding Sam',
    author: 'Justiniano Filipe Terroso',
    authorUrl: 'https://sketchfab.com/justin_phillips?utm_medium=embed&utm_campaign=share-popup&utm_content=e38963c8dfed48a6bfad2effa41ae3ff',
    modelUrl: 'https://sketchfab.com/3d-models/death-stranding-sam-e38963c8dfed48a6bfad2effa41ae3ff?utm_medium=embed&utm_campaign=share-popup&utm_content=e38963c8dfed48a6bfad2effa41ae3ff',
  };

  const currentModel = active === 'bts' ? btsModel : defaultModel;

  const handleClick = (id) => {
    setActive(active === id ? null : id);
  };

  const renderSection = (section, right = false) => {
    const dialogClass = right ? 'side-dialog right-dialog' : 'side-dialog';
    const isOpen = active === section.id;

    return (
      <div className="floating-button-group" key={section.id}>
        <button
          className="side-button"
          type="button"
          aria-label={section.data.title}
          aria-expanded={isOpen}
          aria-controls={`${section.id}-panel`}
          onClick={() => handleClick(section.id)}
        >
          <span className="icon">{iconMap[section.id] ?? '•'}</span>
        </button>
        <div id={`${section.id}-panel`} className={dialogClass} role="region">
          <h4>{section.data.title}</h4>
          <p>{section.data.summary}</p>
          {section.data.details.map((item) => (
            <div key={`${section.id}-${item.heading}`}>
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
