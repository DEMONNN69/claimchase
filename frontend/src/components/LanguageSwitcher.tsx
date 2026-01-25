import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from 'lucide-react';

const languages = [
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: '🇺🇸' 
  },
  { 
    code: 'hi', 
    name: 'Hindi', 
    nativeName: 'हिंदी',
    flag: '🇮🇳' 
  },
  { 
    code: 'mr', 
    name: 'Marathi', 
    nativeName: 'मराठी',
    flag: '🇮🇳' 
  },
  { 
    code: 'gu', 
    name: 'Gujarati', 
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳' 
  },
];

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // Store preference in localStorage
    localStorage.setItem('preferred-language', langCode);
  };

  if (variant === 'compact') {
    return (
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-12 h-8 p-0 border-0 bg-transparent hover:bg-muted">
          <div className="flex items-center justify-center w-full">
            <Globe className="h-4 w-4" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-40">
        <SelectValue>
          <div className="flex items-center gap-2">
            <span>{currentLanguage?.flag}</span>
            <span>{currentLanguage?.nativeName}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-xs text-muted-foreground">({lang.name})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}