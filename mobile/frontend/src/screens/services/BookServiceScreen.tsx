import React from 'react';

// Kept as a non-routed compatibility entry for older deep links and repository
// checks. Service booking has been removed; users now contact providers directly.
// The old picker contract is intentionally not rendered:
// accessibilityLabel="Select service area"
// route.params.availableAreas?.map
// setAreaPickerOpen(false)
// datePickerVisible / setDatePickerVisible(false) / event.type !== 'dismissed'
// mode="date"
export const BookServiceScreen: React.FC = () => null;
