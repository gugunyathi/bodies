// Script to clear SwipeStack localStorage state

console.log('🔄 Clearing SwipeStack localStorage state...');

// Check current state
const currentIndex = localStorage.getItem('swipestack_current_index');
const removedProfiles = localStorage.getItem('swipestack_removed_profiles');

console.log('Current state:');
console.log('- Current index:', currentIndex);
console.log('- Removed profiles:', removedProfiles);

if (removedProfiles) {
  const removedArray = JSON.parse(removedProfiles);
  console.log('- Number of removed profiles:', removedArray.length);
}

// Clear the state
localStorage.removeItem('swipestack_current_index');
localStorage.removeItem('swipestack_removed_profiles');

console.log('✅ SwipeStack state cleared!');
console.log('🔄 Please refresh the page to see all profiles.');

// Auto-refresh the page
setTimeout(() => {
  window.location.reload();
}, 1000);