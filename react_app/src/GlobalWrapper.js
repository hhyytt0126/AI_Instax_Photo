import './App.css';

function GlobalWrapper({ children }) {   
  return (
    <div className="App">
      <header className="App-header">
        {children}
      </header>
    </div>
  );
}
export default GlobalWrapper;