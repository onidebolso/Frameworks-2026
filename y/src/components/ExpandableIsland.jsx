import { useState } from 'react';

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
  const [active, setActive] = useState(null);
  const gif = active === 'bts' ? '/SAM2.gif' : '/SAM1.gif';

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
    <div className="content-with-buttons interactive-island">
      <div className="side-buttons left-buttons">
        {leftButtons.map((section) => renderSection(section))}
      </div>

      <img src={gif} alt="Sam" className="sam-gif" />

      <div className="side-buttons right-buttons">
        {rightButtons.map((section) => renderSection(section, true))}
      </div>
    </div>
  );
}
