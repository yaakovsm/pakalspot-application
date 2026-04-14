import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { contactAPI } from '../api/api';
import { useToast } from '../hooks/use-toast';
import { getApiErrorDetail } from '../utils/apiError';
import MobileLayout from '../components/mobile/MobileLayout';

const Contact: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRtl = (i18n.language || 'he').startsWith('he');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issue, setIssue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await contactAPI.submit({
        name: name.trim(),
        email: email.trim(),
        issue: issue.trim(),
      });
      toast({
        title: t('contact.success_title'),
        description: t('contact.success_description'),
      });
      setName('');
      setEmail('');
      setIssue('');
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getApiErrorDetail(err, t('contact.error_generic')),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'rounded-lg';

  return (
    <MobileLayout>
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-background">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
          <h1 className="text-2xl sm:text-4xl font-bold text-primary mb-2 sm:mb-3">{t('contact.title')}</h1>
          <p className="text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed">
            {t('contact.subtitle')}
          </p>
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name" className="sr-only">
                  {t('contact.name')}
                </Label>
                <Input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('contact.name_placeholder')}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email" className="sr-only">
                  {t('contact.email')}
                </Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('contact.email_placeholder')}
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-issue" className="sr-only">
                {t('contact.issue')}
              </Label>
              <Textarea
                id="contact-issue"
                name="issue"
                required
                minLength={1}
                maxLength={10000}
                rows={5}
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder={t('contact.issue_placeholder')}
                className={`resize-y min-h-[140px] sm:min-h-[160px] ${fieldClass}`}
              />
            </div>
            <Button type="submit" className="w-full rounded-lg min-h-11 sm:min-h-12" size="lg" disabled={submitting}>
              {submitting ? t('contact.submitting') : t('contact.submit')}
            </Button>
          </form>
        </main>
      </div>
    </MobileLayout>
  );
};

export default Contact;
