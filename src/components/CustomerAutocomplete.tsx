import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Phone, MapPin, CreditCard, User } from 'lucide-react';
import { Customer } from '../types';
import importedClientsRaw from '../data/imported_clients.json';

const IMPORTED_CLIENTS: any[] = importedClientsRaw;

interface CustomerAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (client: {
    name: string;
    phone: string;
    address: string;
    cpf: string;
    email: string;
    birthDate: string;
  }) => void;
  user: any | null;
  customers: Customer[];
  placeholder?: string;
  required?: boolean;
}

export default function CustomerAutocomplete({
  value,
  onChange,
  onSelect,
  user,
  customers,
  placeholder = 'Ex: João da Silva',
  required = false
}: CustomerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCompanyAccount = user?.email?.toLowerCase() === 'infocamseguranca@gmail.com';

  // Merge custom & imported clients
  const allClients = useMemo(() => {
    const customList = customers.map(c => ({
      name: c.name,
      phone: c.phone || '',
      address: c.address || '',
      cpf: c.cpf || '',
      email: c.email || '',
      birthDate: c.birthDate || '',
      source: 'custom'
    }));

    if (isCompanyAccount) {
      const importedList = IMPORTED_CLIENTS.map(c => ({
        name: c.name,
        phone: c.phone || '',
        address: c.address || '',
        cpf: c.cpf || '',
        email: '',
        birthDate: '',
        source: 'importado'
      }));
      // Filter out duplicate names
      const seen = new Set(customList.map(c => c.name.toLowerCase()));
      const filteredImported = importedList.filter(c => !seen.has(c.name.toLowerCase()));
      return [...customList, ...filteredImported];
    }

    return customList;
  }, [customers, isCompanyAccount]);

  // Filter suggestions based on typed value
  const suggestions = useMemo(() => {
    const typed = value.toLowerCase().trim();
    if (!typed || !isOpen) return [];

    return allClients.filter(c => 
      c.name.toLowerCase().includes(typed) ||
      (c.phone && c.phone.toLowerCase().includes(typed)) ||
      (c.cpf && c.cpf.toLowerCase().includes(typed))
    ).slice(0, 5); // Limit to top 5 suggestions for speed
  }, [allClients, value, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 pr-8"
          placeholder={placeholder}
        />
        <div className="absolute right-2.5 top-2 text-zinc-400">
          <Search size={14} />
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-zinc-100">
          {suggestions.map((client, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onSelect({
                  name: client.name,
                  phone: client.phone,
                  address: client.address,
                  cpf: client.cpf,
                  email: client.email,
                  birthDate: client.birthDate
                });
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors flex flex-col gap-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900">{client.name}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                  client.source === 'importado' 
                    ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' 
                    : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                }`}>
                  {client.source === 'importado' ? 'Importado' : 'Salvo'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-400 mt-0.5">
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={9} /> {client.phone}
                  </span>
                )}
                {client.cpf && (
                  <span className="flex items-center gap-1 font-mono">
                    <CreditCard size={9} /> {client.cpf}
                  </span>
                )}
                {client.address && (
                  <span className="flex items-center gap-1 max-w-[200px] truncate">
                    <MapPin size={9} /> {client.address}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
