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
