import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LogOut,
  Send,
  UserRound,
} from 'lucide-react';
import CctvEvidenceStep from './CctvEvidenceStep';
import CctvIdentificationStep from './CctvIdentificationStep';
import CctvInspectionStep from './CctvInspectionStep';
import { createInitialCctvChecklist, CCTV_STEPS } from './cctvConstants';
import useCctvForm from './useCctvForm';
import './cctv.css';

export default function CctvForm({ onBack, technician }) {
  const form = useCctvForm(technician);
  const {
    checkedItems,
    currentStep,
    databaseError,
    fotoAntes,
    fotoDespues,
    formData,
    goToNextStep,
    goToPreviousStep,
    handleSubmit,
    loadingData,
    matchingCameras,
    message,
    saving,
    selectCamera,
    selectedCamera,
    setFotoAntes,
    setFotoDespues,
    toggleChecklistItem,
    updateField,
    captureSession,
    cameras,
  } = form;
  const step = CCTV_STEPS[currentStep];
  const progress = ((currentStep + 1) / CCTV_STEPS.length) * 100;
  const checklistChanged = checkedItems.length !== createInitialCctvChecklist().length
    || createInitialCctvChecklist().some((item) => !checkedItems.includes(item));
  const hasPendingChanges = Boolean(
    formData.idDispositivo
    || formData.observacion
    || formData.estadoInicial !== 'Operativo'
    || formData.estadoFinal !== 'Operativo'
    || checklistChanged
    || fotoAntes
    || fotoDespues,
  );

  const leaveCctvForm = () => {
    if (saving) return;
    if (hasPendingChanges && !window.confirm('Se descartará el registro CCTV que no has guardado. ¿Quieres salir?')) {
      return;
    }
    onBack();
  };

  const handlePrevious = () => {
    if (currentStep === 0) leaveCctvForm();
    else goToPreviousStep();
  };

  return (
    <>
      <div className="session-bar">
        <span className="session-user">
          <UserRound size={16} aria-hidden="true" />
          <span><strong>Técnico</strong> {technician}</span>
        </span>
        <button
          type="button"
          className="session-exit"
          onClick={leaveCctvForm}
          disabled={saving}
          aria-label="Cambiar de sistema"
          title="Cambiar de sistema"
        >
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>

      <section className="intro">
        <span className="eyebrow">REGISTRO DE MANTENIMIENTO</span>
        <h1>Inspección CCTV</h1>
        <p>Completa cada etapa para documentar la revisión de la cámara.</p>
      </section>

      <section className="stepper" aria-label={`Paso ${currentStep + 1} de ${CCTV_STEPS.length}`}>
        <div className="progress-ring" style={{ '--progress': `${progress}%` }}>
          <span>{currentStep + 1}<small>/{CCTV_STEPS.length}</small></span>
        </div>
        <div className="stepper-copy">
          <span className="step-count">PASO {currentStep + 1} DE {CCTV_STEPS.length}</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          {currentStep < CCTV_STEPS.length - 1 && (
            <span className="next-step">Siguiente: {CCTV_STEPS[currentStep + 1].title}</span>
          )}
        </div>
      </section>

      <div
        className="progress-track"
        role="progressbar"
        aria-label="Progreso del formulario CCTV"
        aria-valuemin={1}
        aria-valuemax={CCTV_STEPS.length}
        aria-valuenow={currentStep + 1}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      {message && (
        <div className={`alert-box alert-${message.type}`} role="status">
          {message.type === 'error'
            ? <AlertCircle size={17} aria-hidden="true" />
            : <CheckCircle2 size={17} aria-hidden="true" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-stack">
        {currentStep === 0 && (
          <CctvIdentificationStep
            databaseError={databaseError}
            formData={formData}
            loadingData={loadingData}
            matchingCameras={matchingCameras}
            selectCamera={selectCamera}
            selectedCamera={selectedCamera}
            totalCameras={cameras}
            updateField={updateField}
          />
        )}
        {currentStep === 1 && (
          <CctvInspectionStep
            checkedItems={checkedItems}
            formData={formData}
            onToggle={toggleChecklistItem}
            updateField={updateField}
          />
        )}
        {currentStep === 2 && (
          <CctvEvidenceStep
            captureSession={captureSession}
            formData={formData}
            setFotoAntes={setFotoAntes}
            setFotoDespues={setFotoDespues}
            updateField={updateField}
          />
        )}

        <div className="form-navigation">
          {currentStep > 0
            ? (
              <button type="button" className="btn-secondary" onClick={handlePrevious} disabled={saving}>
                <ArrowLeft size={17} aria-hidden="true" />
                <span>Anterior</span>
              </button>
            )
            : (
              <button type="button" className="btn-secondary" onClick={leaveCctvForm} disabled={saving}>
                <ArrowLeft size={17} aria-hidden="true" />
                <span>Volver a sistemas</span>
              </button>
            )}

          {currentStep < CCTV_STEPS.length - 1
            ? (
              <button
                key={`cctv-next-${currentStep}`}
                type="button"
                className="btn-primary"
                onClick={goToNextStep}
                disabled={loadingData || Boolean(databaseError)}
              >
                <span>Continuar</span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            )
            : (
              <button key="cctv-save-registration" type="submit" className="btn-primary" disabled={saving}>
                <Send size={16} aria-hidden="true" />
                <span>{saving ? 'Guardando…' : 'Guardar registro'}</span>
              </button>
            )}
        </div>
      </form>

      <footer className="app-footer">
        <span>Johnson Controls</span>
        <span className="footer-dot" />
        <span>Sistema CCTV</span>
      </footer>
    </>
  );
}
