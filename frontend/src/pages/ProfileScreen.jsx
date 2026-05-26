import { useRef, useState } from "react";

import { DashboardHeader } from "../components/DashboardHeader";
import { ConfirmDialog } from "../components/modals/ConfirmDialog";
import { PasswordInput } from "../components/forms/PasswordInput";
import { TextInput } from "../components/forms/TextInput";
import { updateUser } from "../services/authService";
import { views } from "../routes/views";

function splitFullName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return { lastname: "", name: parts[0] ?? "" };
  }

  return {
    lastname: parts.slice(1).join(" "),
    name: parts[0],
  };
}

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024;

function avatarLetter(name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toLocaleUpperCase("es-CR");
}

function readProfileImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;

        context.drawImage(image, x, y, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

export function ProfileScreen({ currentUser, goTo, onLogout, onUserUpdate }) {
  const userId = currentUser?.id_usuario;
  const userName = splitFullName(currentUser?.nombre);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: userName.name,
    lastname: userName.lastname,
    email: currentUser?.correo ?? "",
    password: "",
    profileImage: currentUser?.foto_perfil ?? "",
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const fullName = `${formData.name} ${formData.lastname}`.trim();
  const normalizedEmail = formData.email.trim().toLowerCase();
  const currentProfileImage = currentUser?.foto_perfil ?? "";
  const hasUserChanges =
    fullName !== (currentUser?.nombre ?? "") ||
    normalizedEmail !== (currentUser?.correo ?? "").toLowerCase() ||
    Boolean(formData.password) ||
    formData.profileImage !== currentProfileImage;

  function updateField(field, value) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
    setSuccessMessage("");
  }

  async function handleProfileImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors((currentErrors) => ({ ...currentErrors, profileImage: undefined }));
    setSuccessMessage("");

    if (!file.type.startsWith("image/")) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        profileImage: "Selecciona un archivo de imagen.",
      }));
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        profileImage: "La imagen no puede superar 2 MB.",
      }));
      return;
    }

    try {
      const profileImage = await readProfileImage(file);
      updateField("profileImage", profileImage);
    } catch (error) {
      setErrors((currentErrors) => ({ ...currentErrors, profileImage: error.message }));
    } finally {
      event.target.value = "";
    }
  }

  function removeProfileImage() {
    updateField("profileImage", "");
    setErrors((currentErrors) => ({ ...currentErrors, profileImage: undefined }));
  }

  function requestCancel() {
    if (hasUserChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    goTo(views.home);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (!hasUserChanges) {
      return;
    }

    if (fullName.length < 2) {
      nextErrors.name = "Ingresa tu nombre.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Ingresa tu correo electrónico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (formData.password && formData.password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    }

    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const backendUpdates = {};

    if (fullName !== currentUser.nombre) {
      backendUpdates.nombre = fullName;
    }

    if (normalizedEmail !== currentUser.correo) {
      backendUpdates.correo = normalizedEmail;
    }

    if (formData.password) {
      backendUpdates.contrasena = formData.password;
    }

    if (formData.profileImage !== currentProfileImage) {
      backendUpdates.foto_perfil = formData.profileImage || null;
    }

    try {
      setIsSubmitting(true);
      let updatedUser = currentUser;

      if (Object.keys(backendUpdates).length > 0) {
        const response = await updateUser(userId, backendUpdates);
        updatedUser = response.data;
        onUserUpdate(updatedUser);
      }

      setFormData((currentData) => ({
        ...currentData,
        email: normalizedEmail,
        password: "",
        profileImage: updatedUser?.foto_perfil ?? "",
      }));
      setSuccessMessage("Perfil actualizado correctamente.");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="home-page profile-page" id="contenido-principal" tabIndex={-1} aria-labelledby="profile-title">
      <DashboardHeader
        activeView={views.profile}
        currentUser={currentUser}
        goTo={goTo}
        onLogout={onLogout}
      />

      <section className="profile-content">
        <div className="profile-heading">
          <div>
            <p className="eyebrow">Perfil</p>
            <h1 id="profile-title">Información personal</h1>
            <p>Actualiza los datos de tu cuenta y la información visible en TravelSplit.</p>
          </div>
        </div>

        <form className="profile-card" onSubmit={handleSubmit} noValidate>
          <div className="section-heading">
            <p className="form-section-title">Información personal</p>
            <span>Estos datos ayudan a identificarte dentro de tus viajes compartidos.</span>
          </div>

          <section className="profile-photo-section" aria-label="Foto de perfil">
            <div className="profile-photo-preview">
              {formData.profileImage ? (
                <img src={formData.profileImage} alt="Foto de perfil actual" />
              ) : (
                <span aria-hidden="true">{avatarLetter(fullName)}</span>
              )}
            </div>
            <div className="profile-photo-controls">
              <div>
                <p className="profile-photo-title">Foto de perfil</p>
              </div>
              <div className="profile-photo-actions">
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  id="profile-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  tabIndex={-1}
                />
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Agregar foto
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={removeProfileImage}
                  disabled={!formData.profileImage}
                >
                  Borrar
                </button>
              </div>
              {errors.profileImage ? (
                <p className="field-error" role="alert">
                  {errors.profileImage}
                </p>
              ) : null}
            </div>
          </section>

          <div className="two-columns">
            <TextInput
              error={errors.name}
              id="profile-name"
              label="Nombre"
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Juan"
              value={formData.name}
            />
            <TextInput
              id="profile-lastname"
              label="Apellido"
              onChange={(event) => updateField("lastname", event.target.value)}
              placeholder="Pérez"
              value={formData.lastname}
            />
          </div>

          <TextInput
            error={errors.email}
            id="profile-email"
            label="Correo electrónico"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="juan@correo.com"
            type="email"
            value={formData.email}
          />

          <PasswordInput
            error={errors.password}
            id="profile-password"
            label="Contraseña"
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Ingresa una nueva contraseña"
            value={formData.password}
          />

          {errors.form ? (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          ) : null}
          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <div className="profile-actions">
            <button className="secondary-button" type="button" onClick={requestCancel}>
              Cancelar
            </button>
            <button className="primary-button" disabled={isSubmitting || !hasUserChanges} type="submit">
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <ConfirmDialog
        isOpen={isDiscardConfirmOpen}
        title="Descartar cambios"
        description="Hay cambios sin guardar. Si cancelas, se perderán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onCancel={() => setIsDiscardConfirmOpen(false)}
        onConfirm={() => {
          setIsDiscardConfirmOpen(false);
          goTo(views.home);
        }}
      />
    </main>
  );
}
