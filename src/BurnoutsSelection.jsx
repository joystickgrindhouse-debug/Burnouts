import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";

export default function BurnoutsSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      signInWithCustomToken(auth, token)
        .then(() => {
          console.log('Successfully signed in with token on selection page');
        })
        .catch((error) => {
          console.error('Error signing in with token:', error);
        });
    }
  }, [searchParams]);

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
