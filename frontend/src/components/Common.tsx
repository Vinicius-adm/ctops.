import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-6 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: number | string;
  icon: string;
  color: 'blue' | 'green' | 'red' | 'yellow';
  trend?: number;
}

export function KPICard({ title, value, icon, color, trend }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200'
  };

  const iconClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600'
  };

  return (
    <Card className={`border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs. semana anterior
            </p>
          )}
        </div>
        <div className={`text-4xl ${iconClasses[color]}`}>{icon}</div>
      </div>
    </Card>
  );
}

interface BadgeProps {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ label, variant }: BadgeProps) {
  const classes = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${classes[variant]}`}>
      {label}
    </span>
  );
}

interface DataTableProps {
  columns: string[];
  children: ReactNode;
}

export function DataTable({ columns, children }: DataTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = ''
}: ButtonProps) {
  const classes = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
        classes[variant]
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface FormInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function FormInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false
}: FormInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      />
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon: string;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <Card className="text-center py-12">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Card>
  );
}

interface LoadingProps {
  message?: string;
}

export function Loading({ message = 'Carregando...' }: LoadingProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
          <div className="w-10 h-10 bg-white rounded-full"></div>
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
