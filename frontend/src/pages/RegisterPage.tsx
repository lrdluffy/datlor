import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full"
      >
        <div className="text-center mb-6">
          <h2 className="text-base font-bold text-ink">بسازیم حسابت رو</h2>
          <p className="text-sm text-ink/60 mt-1">
            برای شروع، اطلاعات زیر را تکمیل کنید
          </p>
        </div>

        <form className="relative space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1.5" htmlFor="email">
              آدرس ایمیل
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/60" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`w-full rounded-lg border-2 bg-slate-50/80 pr-10 pl-3 py-2 text-sm text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent ${
                  errors.email ? 'border-red-400' : 'border-line'
                }`}
                placeholder="you@example.com"
                value={values.email}
                onChange={handleChange('email')}
              />
            </div>
            <p
              className={`text-xs text-red-600 mt-1.5 h-4 leading-4 transition-opacity duration-200 ${
                errors.email ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {errors.email || '\u00A0'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1.5" htmlFor="displayName">
              نام نمایشی <span className="text-ink/40 font-normal">(اختیاری)</span>
            </label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/60" />
              <input
                id="displayName"
                type="text"
                autoComplete="nickname"
                className="w-full rounded-lg border-2 border-line bg-slate-50/80 pr-10 pl-3 py-2 text-sm text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent"
                placeholder="نام شما"
                value={values.displayName}
                onChange={handleChange('displayName')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1.5" htmlFor="password">
              رمز عبور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/60" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`w-full rounded-lg border-2 bg-slate-50/80 pr-10 pl-10 py-2 text-sm text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent ${
                  errors.password ? 'border-red-400' : 'border-line'
                }`}
                placeholder="••••••••"
                value={values.password}
                onChange={handleChange('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-accent transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p
              className={`text-xs text-red-600 mt-1.5 h-4 leading-4 transition-opacity duration-200 ${
                errors.password ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {errors.password || '\u00A0'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1.5" htmlFor="confirmPassword">
              تکرار رمز عبور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent/60" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`w-full rounded-lg border-2 bg-slate-50/80 pr-10 pl-10 py-2 text-sm text-ink placeholder:text-ink/30 transition-all focus:outline-none focus:bg-white focus:ring-4 focus:ring-accent/25 focus:border-accent ${
                  errors.confirmPassword ? 'border-red-400' : 'border-line'
                }`}
                placeholder="••••••••"
                value={values.confirmPassword}
                onChange={handleChange('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-accent transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p
              className={`text-xs text-red-600 mt-1.5 h-4 leading-4 transition-opacity duration-200 ${
                errors.confirmPassword ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {errors.confirmPassword || '\u00A0'}
            </p>
          </div>

          <div
            className={`text-xs rounded-lg px-3 py-2 border h-9 flex items-center transition-opacity duration-200 ${
              errors.form
                ? 'text-red-600 bg-red-50 border-red-100 opacity-100'
                : 'text-transparent bg-transparent border-transparent opacity-0'
            }`}
          >
            {errors.form || '\u00A0'}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-accent via-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg py-2.5 shadow-lg shadow-accent/35 transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ثبت‌نام'}
            </button>
            <Link
              to="/login"
              className="flex-1 inline-flex items-center justify-center gap-1.5 border-2 border-line text-sm font-medium rounded-lg py-2.5 text-ink/80 transition-colors hover:bg-accent/5 hover:border-accent/40 hover:text-accent"
            >
              ورود
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </form>
      </motion.div>
    </AuthLayout>
  );
}