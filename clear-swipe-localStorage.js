// Clear SwipeStack localStorage to show all profiles
if (typeof window !== 'undefined' && window.localStorage) {
  console.log('Before clearing:');
  console.log('swipestack_removed_profiles:', localStorage.getItem('swipestack_removed_profiles'));
  console.log('swipestack_current_index:', localStorage.getItem('swipestack_current_index'));
  
  // Clear the localStorage items
  localStorage.removeItem('swipestack_removed_profiles');
  localStorage.removeItem('swipestack_current_index');
  
  console.log('After clearing:');
  console.log('swipestack_removed_profiles:', localStorage.getItem('swipestack_removed_profiles'));
  console.log('swipestack_current_index:', localStorage.getItem('swipestack_current_index'));
  
  console.log('✅ SwipeStack localStorage cleared! Refresh the page to see all profiles.');
} else {
  console.log('❌ localStorage not available');
}