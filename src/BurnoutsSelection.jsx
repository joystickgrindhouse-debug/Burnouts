import { useNavigate } from "react-router-dom";

export default function BurnoutsSelection() {
  const navigate = useNavigate();

  const selectMuscleGroup = (group) => {
    navigate(`/burnouts/${group}`);
  };

  const buttons = [
    { name: "Arms", icon: "/assets/icons/arms.png" },
    { name: "Legs", icon: "/assets/icons/legs.png" },
    { name: "Core", icon: "/assets/icons/core.png" },
    { name: "Cardio", icon: "/assets/icons/cardio.png" },
  ];

  return (
    <div className="selection-container">
      <button className="home-button" onClick={() => window.location.href = '/'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>
      <h1>Select Muscle Group</h1>
      <div className="buttons-grid">
        {buttons.map((btn) => (
          <div 
            key={btn.name} 
            className="button-card" 
            onClick={() => selectMuscleGroup(btn.name)}
          >
            <img src={btn.icon} alt={btn.name} className="button-icon" />
            <span>{btn.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
