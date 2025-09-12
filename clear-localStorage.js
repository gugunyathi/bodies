// Script to check and clear localStorage data that might be filtering profiles

console.log('Checking localStorage for profile filtering issues...');

// Check what's in localStorage
const swipeStackIndex = localStorage.getItem('swipestack_current_index');
const removedProfiles = localStorage.getItem('swipestack_removed_profiles');

console.log('Current swipe index:', swipeStackIndex);
console.log('Removed profiles:', removedProfiles);

if (removedProfiles) {
  const removedSet = JSON.parse(removedProfiles);
  console.log('Number of removed profiles:', removedSet.length);
  console.log('Removed profile IDs:', removedSet);
}

// Clear the localStorage to reset the swipe stack
console.log('Clearing localStorage...');
localStorage.removeItem('swipestack_current_index');
localStorage.removeItem('swipestack_removed_profiles');

console.log('localStorage cleared. Please refresh the page.');