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
import SacsEvidenceStep from './SacsEvidenceStep';
import SacsIdentificationStep from './SacsIdentificationStep';
import SacsInspectionStep from './SacsInspectionStep';
import { getDefaultSacsChecklist, SACS_STEPS } from './sacsConstants';
import useSacsForm from './useSacsForm';
import './sacs.css';

export default function SacsForm({ onBack, technician }) {
  const form = useSacsForm(technician);
  const {
    checkedItems,
    currentStep,
    databaseError,
    devicesCount,
    fotoAntes,
    fotoDespues,
    formData,
    goToNextStep,
    goToPreviousStep,
    handleSubmit,
    loadingData,
    matchingDevices,
    message,
    saving,
    selectDevice,
    selectedDevice,
    setFotoAntes,
    setFotoDespues,
    setSheet,
    toggleChecklistItem,
    updateField,
    updateNumericValue,
    captureSession,
  } = form;

  const step = SACS_STEPS[currentStep];
  const progress = ((currentStep + 1) / SACS_STEPS.length) * 100;
  const defaultChecklist = getDefaultSacsChecklist(formData.hoja);
  const checklistChanged = checkedItems.length !== defaultChecklist.length
    || defaultChecklist.some((item) => !checkedItems.includes(item));
  const hasPendingChanges = Boolean(
    formData.hoja
    || formData.idDispositivo
    || formData.general
    || formData.observacion
    || checklistChanged
    || fotoAntes
    || fotoDespues
    || Object.keys(formData.numericValues).length,
  );

  const leaveSacsForm = () => {
    if (saving) return;
    if (hasPendingChanges && !window.confirm('Se descartará el registro SACS que no has guardado. ¿Quieres salir?')) {
      return;
    }
    onBack();
  };

  const handlePrevious = () => {
    if (currentStep === 0) leaveSacsForm();
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
          onClick={leaveSacsForm}
          disabled={saving}
          aria-label="Cambiar de sistema"
          title="Cambiar de sistema"
        >
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>

      <section className="intro">
        <span className="eyebrow">REGISTRO DE MANTENIMIENTO</span>
        <h1>Inspección SACS</h1>
        <p>Selecciona la matriz y documenta cada etapa del mantenimiento.</p>
      </section>

      <section className="stepper" aria-label={`Paso ${currentStep + 1} de ${SACS_STEPS.length}`}>
        <div className="progress-ring" style={{ '--progress': `${progress}%` }}>
          <span>{currentStep + 1}<small>/{SACS_STEPS.length}</small></span>
        </div>
        <div className="stepper-copy">
          <span className="step-count">PASO {currentStep + 1} DE {SACS_STEPS.length}</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
          {currentStep < SACS_STEPS.length - 1 && (
            <span className="next-step">Siguiente: {SACS_STEPS[currentStep + 1].title}</span>
          )}
        </div>
      </section>

      <div
        className="progress-track"
        role="progressbar"
        aria-label="Progreso del formulario SACS"
        aria-valuemin={1}
        aria-valuemax={SACS_STEPS.length}
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
          <SacsIdentificationStep
            databaseError={databaseError}
            formData={formData}
            loadingData={loadingData}
            matchingDevices={matchingDevices}
            selectDevice={selectDevice}
            selectedDevice={selectedDevice}
            totalDevices={devicesCount}
            setSheet={setSheet}
            updateField={updateField}
          />
        )}
        {currentStep === 1 && (
          <SacsInspectionStep
            checkedItems={checkedItems}
            formData={formData}
            onToggle={toggleChecklistItem}
            updateField={updateField}
            updateNumericValue={updateNumericValue}
          />
        )}
        {currentStep === 2 && (
          <SacsEvidenceStep
            captureSession={captureSession}
            formData={formData}
            setFotoAntes={setFotoAntes}
            setFotoDespues={setFotoDespues}
            updateField={updateField}
          />
        )}

        <div className="form-navigation">
          <div className="form-navigation">
              {currentStep > 0 ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrevious}
                  disabled={saving}
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                  <span>Anterior</span>
                </button>
              ) : (
                <span className="navigation-spacer" />
              )}
            </div>

          {currentStep < SACS_STEPS.length - 1
            ? (
              <button
                key={`sacs-next-${currentStep}`}
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
              <button key="sacs-save-registration" type="submit" className="btn-primary" disabled={saving}>
                <Send size={16} aria-hidden="true" />
                <span>{saving ? 'Guardando…' : 'Guardar registro'}</span>
              </button>
            )}
        </div>
      </form>

      <footer className="app-footer">
        <span>Johnson Controls</span>
        <span className="footer-dot" />
        <span>Sistema SACS</span>
      </footer>
    </>
  );
}
