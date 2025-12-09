import PropTypes from 'prop-types';
import { useMemo } from 'react';
function generateTimeSlots(startHour, endHour) {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    const hourStr = String(hour).padStart(2, '0');
    slots.push(`${hourStr}:00`);
    slots.push(`${hourStr}:30`);
  }
  return slots;
}

export default function AvailibilityCard({
  day,
  availability,
  setNewAvailability,
}) {
  const slots = useMemo(() => generateTimeSlots(9, 17), []); // 9:00 AM to 5:00 PM (17:00)

  const toggleSlot = (time) => {
    const newSet = new Set(availability);
    if (newSet.has(time)) {
      newSet.delete(time);
    } else {
      newSet.add(time);
    }
    setNewAvailability(newSet);
  };

  const selectedCount = availability.size;
  const totalSlots = slots.length;

  // Separate slots into morning (9:00 - 12:00) and afternoon (12:30 - 17:00)
  const morningSlots = slots.filter((time) => {
    const hour = parseInt(time.split(':')[0]);
    return hour < 12;
  });

  const afternoonSlots = slots.filter((time) => {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 12;
  });

  return (
    <div className="day-card">
      <div className="day-header">
        {day}
        {selectedCount > 0 && (
          <span className="selection-count">
            {selectedCount} of {totalSlots} slots selected
          </span>
        )}
      </div>

      {/* Morning Section */}
      <div className="time-section">
        <div className="time-section-header">
          <span className="time-section-title">Morning • 9:00 AM - 12:00 PM</span>
        </div>
        <div className="slots-grid" role="group" aria-label={`${day} morning availability slots`}>
          {morningSlots.map((time) => {
            const isSelected = availability.has(time);
            return (
              <button
                key={time}
                type="button"
                className={`slot-button ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSlot(time)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSlot(time);
                    return;
                  }
                  
                  // Arrow key navigation for time slots
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    
                    const dayCard = e.target.closest('.day-card');
                    if (!dayCard) {
                      e.stopPropagation();
                      return;
                    }
                    
                    // Get all time slot buttons in the entire day card (both morning and afternoon)
                    const allDayButtons = Array.from(dayCard.querySelectorAll('.slot-button'));
                    if (allDayButtons.length === 0) {
                      e.stopPropagation();
                      return;
                    }
                    
                    const currentIndex = allDayButtons.findIndex(btn => btn === e.target);
                    if (currentIndex === -1) {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        allDayButtons[0]?.focus();
                      }
                      e.stopPropagation();
                      return;
                    }
                    
                    // Check if at boundary
                    const isLastButton = currentIndex === allDayButtons.length - 1;
                    const isFirstButton = currentIndex === 0;
                    
                    // Parse time helper
                    const parseTime = (timeStr) => {
                      const [hours, minutes] = timeStr.split(':').map(Number);
                      return { hours, minutes, totalMinutes: hours * 60 + minutes };
                    };
                    
                    const currentTime = parseTime(time);
                    let targetButton = null;
                    
                    // Try time-based navigation first
                    let targetMinutes = currentTime.totalMinutes;
                    if (e.key === 'ArrowRight') {
                      targetMinutes += 30;
                    } else if (e.key === 'ArrowLeft') {
                      targetMinutes -= 30;
                    } else if (e.key === 'ArrowDown') {
                      targetMinutes += 120; // 2 hours
                    } else if (e.key === 'ArrowUp') {
                      targetMinutes -= 120; // 2 hours
                    }
                    
                    // Search in all day buttons (morning + afternoon)
                    targetButton = allDayButtons.find(btn => {
                      const btnTime = parseTime(btn.textContent.trim());
                      return btnTime && btnTime.totalMinutes === targetMinutes;
                    });
                    
                    // Fallback to index-based navigation within the day
                    if (!targetButton || targetButton === e.target) {
                      const currentSlotsGrid = e.target.closest('.slots-grid');
                      const gridRect = currentSlotsGrid?.getBoundingClientRect();
                      if (gridRect) {
                        const firstRowButtons = allDayButtons.filter(btn => {
                          const btnRect = btn.getBoundingClientRect();
                          return Math.abs(btnRect.top - gridRect.top) < 20;
                        });
                        const columnsPerRow = firstRowButtons.length || 4;
                        const currentRow = Math.floor(currentIndex / columnsPerRow);
                        const currentCol = currentIndex % columnsPerRow;
                        
                        if (e.key === 'ArrowRight') {
                          if (currentCol < columnsPerRow - 1) {
                            const nextIndex = currentIndex + 1;
                            if (nextIndex < allDayButtons.length) {
                              targetButton = allDayButtons[nextIndex];
                            }
                          }
                        } else if (e.key === 'ArrowLeft') {
                          if (currentCol > 0) {
                            targetButton = allDayButtons[currentIndex - 1];
                          }
                        } else if (e.key === 'ArrowDown') {
                          const nextRowIndex = (currentRow + 1) * columnsPerRow + currentCol;
                          if (nextRowIndex < allDayButtons.length) {
                            targetButton = allDayButtons[nextRowIndex];
                          }
                        } else if (e.key === 'ArrowUp') {
                          if (currentRow > 0) {
                            const prevRowIndex = (currentRow - 1) * columnsPerRow + currentCol;
                            if (prevRowIndex >= 0) {
                              targetButton = allDayButtons[prevRowIndex];
                            }
                          }
                        }
                      }
                    }
                    
                    if (targetButton && targetButton !== e.target) {
                      targetButton.focus();
                      e.stopPropagation();
                    } else {
                      // If no target found within the day and at boundary, let event bubble for cross-day navigation
                      if (
                        (e.key === 'ArrowRight' && isLastButton) ||
                        (e.key === 'ArrowDown' && isLastButton) ||
                        (e.key === 'ArrowLeft' && isFirstButton) ||
                        (e.key === 'ArrowUp' && isFirstButton)
                      ) {
                        // Don't stop propagation, let parent handle cross-day navigation or save button navigation
                        // The event will bubble up to DoctorAvailibility component
                      } else {
                        e.stopPropagation();
                      }
                    }
                  }
                }}
                aria-pressed={isSelected}
                aria-label={`${time} - ${isSelected ? 'Available' : 'Not available'}`}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>

      {/* Afternoon Section */}
      <div className="time-section">
        <div className="time-section-header">
          <span className="time-section-title">Afternoon • 12:30 PM - 5:00 PM</span>
        </div>
        <div className="slots-grid" role="group" aria-label={`${day} afternoon availability slots`}>
          {afternoonSlots.map((time) => {
            const isSelected = availability.has(time);
            return (
              <button
                key={time}
                type="button"
                className={`slot-button ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSlot(time)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSlot(time);
                    return;
                  }
                  
                  // Arrow key navigation for time slots
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    
                    const dayCard = e.target.closest('.day-card');
                    if (!dayCard) {
                      e.stopPropagation();
                      return;
                    }
                    
                    // Get all time slot buttons in the entire day card (both morning and afternoon)
                    const allDayButtons = Array.from(dayCard.querySelectorAll('.slot-button'));
                    if (allDayButtons.length === 0) {
                      e.stopPropagation();
                      return;
                    }
                    
                    const currentIndex = allDayButtons.findIndex(btn => btn === e.target);
                    if (currentIndex === -1) {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        allDayButtons[0]?.focus();
                      }
                      e.stopPropagation();
                      return;
                    }
                    
                    // Check if at boundary
                    const isLastButton = currentIndex === allDayButtons.length - 1;
                    const isFirstButton = currentIndex === 0;
                    
                    // Parse time helper
                    const parseTime = (timeStr) => {
                      const [hours, minutes] = timeStr.split(':').map(Number);
                      return { hours, minutes, totalMinutes: hours * 60 + minutes };
                    };
                    
                    const currentTime = parseTime(time);
                    let targetButton = null;
                    
                    // Try time-based navigation first
                    let targetMinutes = currentTime.totalMinutes;
                    if (e.key === 'ArrowRight') {
                      targetMinutes += 30;
                    } else if (e.key === 'ArrowLeft') {
                      targetMinutes -= 30;
                    } else if (e.key === 'ArrowDown') {
                      targetMinutes += 120; // 2 hours
                    } else if (e.key === 'ArrowUp') {
                      targetMinutes -= 120; // 2 hours
                    }
                    
                    // Search in all day buttons (morning + afternoon)
                    targetButton = allDayButtons.find(btn => {
                      const btnTime = parseTime(btn.textContent.trim());
                      return btnTime && btnTime.totalMinutes === targetMinutes;
                    });
                    
                    // Fallback to index-based navigation within the day
                    if (!targetButton || targetButton === e.target) {
                      const currentSlotsGrid = e.target.closest('.slots-grid');
                      const gridRect = currentSlotsGrid?.getBoundingClientRect();
                      if (gridRect) {
                        const firstRowButtons = allDayButtons.filter(btn => {
                          const btnRect = btn.getBoundingClientRect();
                          return Math.abs(btnRect.top - gridRect.top) < 20;
                        });
                        const columnsPerRow = firstRowButtons.length || 4;
                        const currentRow = Math.floor(currentIndex / columnsPerRow);
                        const currentCol = currentIndex % columnsPerRow;
                        
                        if (e.key === 'ArrowRight') {
                          if (currentCol < columnsPerRow - 1) {
                            const nextIndex = currentIndex + 1;
                            if (nextIndex < allDayButtons.length) {
                              targetButton = allDayButtons[nextIndex];
                            }
                          }
                        } else if (e.key === 'ArrowLeft') {
                          if (currentCol > 0) {
                            targetButton = allDayButtons[currentIndex - 1];
                          }
                        } else if (e.key === 'ArrowDown') {
                          const nextRowIndex = (currentRow + 1) * columnsPerRow + currentCol;
                          if (nextRowIndex < allDayButtons.length) {
                            targetButton = allDayButtons[nextRowIndex];
                          }
                        } else if (e.key === 'ArrowUp') {
                          if (currentRow > 0) {
                            const prevRowIndex = (currentRow - 1) * columnsPerRow + currentCol;
                            if (prevRowIndex >= 0) {
                              targetButton = allDayButtons[prevRowIndex];
                            }
                          }
                        }
                      }
                    }
                    
                    if (targetButton && targetButton !== e.target) {
                      targetButton.focus();
                      e.stopPropagation();
                    } else {
                      // If no target found within the day and at boundary, let event bubble for cross-day navigation
                      if (
                        (e.key === 'ArrowRight' && isLastButton) ||
                        (e.key === 'ArrowDown' && isLastButton) ||
                        (e.key === 'ArrowLeft' && isFirstButton) ||
                        (e.key === 'ArrowUp' && isFirstButton)
                      ) {
                        // Don't stop propagation, let parent handle cross-day navigation or save button navigation
                        // The event will bubble up to DoctorAvailibility component
                      } else {
                        e.stopPropagation();
                      }
                    }
                  }
                }}
                aria-pressed={isSelected}
                aria-label={`${time} - ${isSelected ? 'Available' : 'Not available'}`}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

AvailibilityCard.propTypes = {
  day: PropTypes.string.isRequired,
  availability: PropTypes.object.isRequired,
  setNewAvailability: PropTypes.func.isRequired,
};
