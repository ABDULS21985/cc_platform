'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  Save,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { ApiService, type ProfileData } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { cn } from '@/lib/utils';

interface FormData {
  firstname: string;
  lastname: string;
  phone_number: string;
  bio: string;
}

const EMPTY_FORM: FormData = {
  firstname: '',
  lastname: '',
  phone_number: '',
  bio: '',
};

type UserShape = Partial<ProfileData> & {
  email?: string;
  full_name?: string;
  firstname?: string;
  lastname?: string;
  phone_number?: string;
  bio?: string;
  user_type?: string;
  profile_photo?: string | null;
  created_at?: string;
  email_verified?: boolean;
};

export function AccountInformationForm() {
  const [userData, setUserData] = useState<UserShape | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialRef = useRef<FormData>(EMPTY_FORM);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.profile.get();
        if (!cancelled) setUserData(res.data?.data ?? null);
      } catch (err) {
        if (!cancelled) toastAxiosError(err, 'Failed to load profile');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (userData) {
      const next: FormData = {
        firstname: userData.firstname || '',
        lastname: userData.lastname || '',
        phone_number: userData.phone_number || '',
        bio: userData.bio || '',
      };
      initialRef.current = next;
      setFormData(next);
    }
  }, [userData]);

  const isDirty = React.useMemo(() => {
    return (
      formData.firstname !== initialRef.current.firstname ||
      formData.lastname !== initialRef.current.lastname ||
      formData.phone_number !== initialRef.current.phone_number ||
      formData.bio !== initialRef.current.bio
    );
  }, [formData]);

  const setField = <K extends keyof FormData>(name: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!formData.firstname.trim()) next.firstname = 'First name is required';
    if (!formData.lastname.trim()) next.lastname = 'Last name is required';
    if (
      formData.phone_number &&
      !/^\+?[0-9\s-]{7,}$/.test(formData.phone_number.trim())
    ) {
      next.phone_number = 'Enter a valid phone number';
    }
    if (formData.bio.length > 280) next.bio = 'Bio must be 280 characters or less';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setLoading(true);
    try {
      const res = await ApiService.profile.update(formData);
      if (res.data && res.data.success !== false) {
        toast.success('Profile updated');
        // Reload so the rest of the app picks up the new identity.
        window.location.reload();
      }
    } catch (err) {
      toastAxiosError(err, 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(initialRef.current);
    setErrors({});
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller');
      return;
    }
    const uploadData = new FormData();
    uploadData.append('file', file);
    setImageUploading(true);
    try {
      const res = await ApiService.profile.uploadImage(uploadData);
      if (res.data && res.data.success !== false) {
        toast.success('Profile photo updated');
        window.location.reload();
      }
    } catch (err) {
      toastAxiosError(err, 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const memberSince = userData?.created_at
    ? new Date(userData.created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <form onSubmit={handleSave} className="space-y-8" noValidate>
      {/* Identity card */}
      <Card variant="default" className="overflow-hidden">
        <div
          aria-hidden="true"
          className="h-24 w-full bg-gradient-to-r from-brand-soft via-brand/10 to-info/10"
        />
        <CardContent className="-mt-12 flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="relative shrink-0">
            <Avatar className="size-24 rounded-3xl border-4 border-card shadow-xl ring-1 ring-border">
              <AvatarImage
                src={userData?.profile_photo || userData?.profile_image || undefined}
                className="object-cover"
                alt=""
              />
              <AvatarFallback className="rounded-3xl bg-brand-soft text-2xl font-black text-accent-foreground">
                {userData?.firstname?.charAt(0).toUpperCase() ||
                  userData?.full_name?.charAt(0).toUpperCase() ||
                  'U'}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-card transition-transform hover:scale-105 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {imageUploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="min-w-0 flex-1 sm:pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {userData?.full_name || 'Your name'}
              </h2>
              {userData?.email_verified && (
                <CheckCircle2
                  className="size-5 text-success"
                  aria-label="Email verified"
                />
              )}
            </div>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              @{userData?.firstname?.toLowerCase() || 'username'} ·{' '}
              {userData?.user_type || 'Standard account'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Editable fields */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <FieldRow
          id="firstname"
          label="First name"
          icon={User}
          required
          value={formData.firstname}
          onChange={(v) => setField('firstname', v)}
          error={errors.firstname}
          autoComplete="given-name"
        />
        <FieldRow
          id="lastname"
          label="Last name"
          icon={User}
          required
          value={formData.lastname}
          onChange={(v) => setField('lastname', v)}
          error={errors.lastname}
          autoComplete="family-name"
        />
        <FieldRow
          id="email"
          label="Email address"
          icon={Mail}
          value={userData?.email || ''}
          onChange={() => {}}
          readOnly
          hint="Contact support to change your email."
          autoComplete="email"
        />
        <FieldRow
          id="phone"
          label="Phone number"
          icon={Phone}
          value={formData.phone_number}
          onChange={(v) => setField('phone_number', v)}
          error={errors.phone_number}
          placeholder="+234..."
          inputMode="tel"
          autoComplete="tel"
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="bio"
            className="text-sm font-medium text-foreground"
          >
            Bio
          </label>
          <span
            className={cn(
              'text-[11px] tabular-nums',
              formData.bio.length > 280
                ? 'font-bold text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {formData.bio.length} / 280
          </span>
        </div>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setField('bio', e.target.value)}
          placeholder="A line or two about you. Visible to community members."
          rows={4}
          aria-invalid={errors.bio ? 'true' : undefined}
          aria-describedby={errors.bio ? 'bio-error' : undefined}
          className={cn(
            'custom-scrollbar w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground',
            'transition-colors outline-none hover:border-input focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
            'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30',
            'resize-none'
          )}
        />
        {errors.bio && (
          <p
            id="bio-error"
            role="alert"
            className="flex items-center gap-1.5 text-xs font-medium text-destructive"
          >
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {errors.bio}
          </p>
        )}
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card variant="default" density="compact">
          <CardContent className="flex items-center gap-3 px-5">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning"
              aria-hidden="true"
            >
              <Calendar className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Member since
              </p>
              <p className="text-sm font-semibold text-foreground">{memberSince}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky save bar — only when dirty */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="sticky bottom-4 z-10"
          >
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md sm:flex-row">
              <div className="flex items-center gap-2.5">
                <Badge variant="warningSoft" size="lg">
                  Unsaved changes
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t forget to save your edits.
                </p>
              </div>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  leadingIcon={<RotateCcw className="size-3.5" />}
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={loading}
                  leadingIcon={!loading ? <Save className="size-3.5" /> : undefined}
                >
                  {loading ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

// ---------- Field helper ----------

interface FieldRowProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  readOnly?: boolean;
  hint?: string;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

function FieldRow({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  required,
  readOnly,
  hint,
  error,
  placeholder,
  autoComplete,
  inputMode,
}: FieldRowProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          readOnly={readOnly}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-12 pl-10',
            readOnly && 'cursor-not-allowed bg-muted/40 text-muted-foreground'
          )}
        />
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="size-3.5" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
