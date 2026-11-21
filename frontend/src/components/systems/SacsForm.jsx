import React from 'react';
import SystemPlaceholder from './SystemPlaceholder';

export default function SacsForm({ onBack }) {
  return (
    <SystemPlaceholder
      system="SACS"
      description="Mantenimiento y registro de equipos SACS."
      onBack={onBack}
    />
  );
}
