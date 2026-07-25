import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { ApiErrorResponse } from '../types/auth';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!values.email.trim()) {
    errors.email = 'ایمیل الزامی است';
  } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
    errors.email = 'ایمیل معتبر وارد کنید';
  }
  if (!values.password) {
    errors.password = 'رمز عبور الزامی است';
  } else if (values.password.length < 8) {
    errors.password = 'رمز عبور باید حداقل ۸ کاراکتر باشد';
  } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(values.password)) {
    errors.password = 'رمز عبور باید شامل حرف و عدد باشد';
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'رمز عبور و تکرار آن یکسان نیستند';
  }
  return errors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [values, setValues] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await register({
        email: values.email,
        password: values.password,
        displayName: values.displayName || undefined,
      });
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError<ApiErrorResponse>(err) && err.response) {
        setErrors({ form: err.response.data.message ?? 'ثبت‌نام ناموفق بود' });
      } else {
        setErrors({ form: 'خطایی رخ داد. دوباره تلاش کنید' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="block text-sm text-ink/70 mb-1" htmlFor="email">
            آدرس ایمیل
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={values.email}
            onChange={handleChange('email')}
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm text-ink/70 mb-1" htmlFor="displayName">
            نام نمایشی (اختیاری)
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="nickname"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={values.displayName}
            onChange={handleChange('displayName')}
          />
        </div>

        <div>
          <label className="block text-sm text-ink/70 mb-1" htmlFor="password">
            رمز عبور
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={values.password}
            onChange={handleChange('password')}
          />
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm text-ink/70 mb-1" htmlFor="confirmPassword">
            تکرار رمز عبور
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={values.confirmPassword}
            onChange={handleChange('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        {errors.form && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {errors.form}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-ink text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60"
          >
            {isSubmitting ? '...' : 'ثبت‌نام'}
          </button>
          <Link
            to="/login"
            className="flex-1 text-center border border-line text-sm font-medium rounded-lg py-2 text-ink/80"
          >
            ورود
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
