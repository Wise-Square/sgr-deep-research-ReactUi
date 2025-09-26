import React from 'react';

type TopBarProps = {
  placeholder: string;
  setTheme?: (theme: string) => void;
  current_theme?: string;
};

const themes = {Dark: [] as string[], Light: [] as string[]}
const allFiles = import.meta.glob('/src/Styles/**/*', { eager: false });
Object.keys(allFiles).forEach(filePath => {
    if (filePath.includes('/Dark/')) {
        themes.Dark.push(filePath);
    } else if (filePath.includes('/Light/')) {
        themes.Light.push(filePath);
    }
});

export const TopBar: React.FC<TopBarProps> = ({ placeholder, setTheme, current_theme}) => {
  console.log('TopBar current_theme:', current_theme);
  console.log('TopBar themes:', themes);
  console.log('Current theme files:', themes[current_theme as keyof typeof themes]);
  
  return (
    <div className="top-rect">
      <nav className="navbar bg-body-tertiary">
        <form className="container-fluid">
          <div className="input-group">
            <span className="input-group-text" id="basic-addon1">@</span>
            <input
              type="text"
              className="form-control"
              placeholder={placeholder}
              aria-label="Chat History Search"
              aria-describedby="basic-addon1"
            />
          </div>
        </form>
      </nav>
      <div className="btn-group" role="group" aria-label="Button group with nested dropdown">
        <button type="button" className="btn btn-outline-primary" onClick={() => setTheme?.("/src/Styles/Light/Default.css")}>@</button>
        <button type="button" className="btn btn-outline-primary" onClick={() => setTheme?.("/src/Styles/Dark/Default.css")}>$</button>
        <div className="btn-group" role="group">
          <button type="button" className="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
          </button>
          <ul className="dropdown-menu">
            {themes[current_theme as keyof typeof themes]?.map(theme => (
              <li key={theme}>
                <a className="dropdown-item" href="#" onClick={() => {
                  setTheme?.(theme);
                }}>
                {theme}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TopBar;


