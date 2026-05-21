import React from 'react';
import { FileText, Gift, Heart, Briefcase, Key, Star } from 'lucide-react';
import PropTypes from 'prop-types';
import { useI18n } from '../../contexts/I18nContext';

export const MESSAGE_TEMPLATES = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    icon: Briefcase,
    category: 'work',
    message: `📝 Confidential Meeting Notes\n\nDate: [Date]\nAttendees: [Names]\n\nKey Discussion Points:\n• [Point 1]\n• [Point 2]\n• [Point 3]\n\nAction Items:\n• [Action 1]\n• [Action 2]\n\nNext Steps: [Next steps]`,
    description: 'Share sensitive meeting details',
    expiration: '24'
  },
  {
    id: 'secret-santa',
    name: 'Secret Santa',
    icon: Gift,
    category: 'personal',
    message: `🎅 Secret Santa Reveal!\n\nHo ho ho! I'm your Secret Santa this year! 🎄\n\nI hope you enjoy your gift. I chose it because [reason].\n\nHappy holidays! 🎁`,
    description: 'Reveal your identity secretly',
    expiration: '168'
  },
  {
    id: 'password-share',
    name: 'Password Share',
    icon: Key,
    category: 'security',
    message: `🔐 Shared Credentials\n\nAccount: [Account name]\nUsername: [Username]\nPassword: [Password]\n\n⚠️ Important:\n• Change this password after first use\n• Enable 2FA if available\n• This message will self-destruct after viewing\n\nPlease confirm receipt.`,
    description: 'Securely share login details',
    expiration: '1'
  },
  {
    id: 'love-letter',
    name: 'Love Letter',
    icon: Heart,
    category: 'personal',
    message: `💌 A Secret Message for You\n\nI've been wanting to tell you something special...\n\n[Your heartfelt message here]\n\nWith all my heart,\n[Your name] ❤️`,
    description: 'Express your feelings privately',
    expiration: '72'
  },
  {
    id: 'confession',
    name: 'Anonymous Confession',
    icon: FileText,
    category: 'personal',
    message: `🤫 Anonymous Confession\n\nI need to get this off my chest...\n\n[Your confession here]\n\nThis stays between us. Thank you for listening.`,
    description: 'Share something anonymously',
    expiration: '24'
  },
  {
    id: 'testimonial',
    name: 'Private Feedback',
    icon: Star,
    category: 'work',
    message: `⭐ Confidential Feedback\n\nRegarding: [Subject]\n\nPositive aspects:\n• [Point 1]\n• [Point 2]\n\nAreas for improvement:\n• [Point 1]\n• [Point 2]\n\nOverall assessment: [Your thoughts]\n\nThis feedback is provided in confidence.`,
    description: 'Give honest, private feedback',
    expiration: '24'
  }
];

function MessageTemplates({ onSelectTemplate, onClose }) {
  const { t } = useI18n();

  const toCamel = (id) => id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  const categories = {
    work: t('templates.categoryWork'),
    personal: t('templates.categoryPersonal'),
    security: t('templates.categorySecurity')
  };

  const getExpirationLabel = (exp) => {
    if (exp === '1') return t('templates.duration1h');
    if (exp === '24') return t('templates.duration24h');
    if (exp === '72') return t('templates.duration3d');
    if (exp === '168') return t('templates.duration7d');
    return t('templates.durationCustom');
  };

  const groupedTemplates = MESSAGE_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {});

  return (
    <div className="space-y-6" role="dialog" aria-labelledby="templates-title" aria-describedby="templates-description">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 id="templates-title" className="text-lg font-bold text-gray-900 dark:text-white">{t('templates.title')}</h3>
          <p id="templates-description" className="text-sm text-gray-600 dark:text-gray-400">{t('templates.subtitle')}</p>
        </div>
      </div>

      {Object.entries(groupedTemplates).map(([category, templates]) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            {categories[category]}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="list" aria-label={`${categories[category]} templates`}>
            {templates.map((template) => {
              const IconComponent = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    onSelectTemplate(template);
                    if (onClose) onClose();
                  }}
                  role="listitem"
                  aria-label={`${t(`templates.${toCamel(template.id)}_name`, {}, template.name)}: ${t(`templates.${toCamel(template.id)}_desc`, {}, template.description)}`}
                  className="group p-4 text-left bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 dark:hover:border-red-500 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {t(`templates.${toCamel(template.id)}_name`, {}, template.name)}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t(`templates.${toCamel(template.id)}_desc`, {}, template.description)}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded" aria-label={`Expires in: ${getExpirationLabel(template.expiration)}`}>
                          {getExpirationLabel(template.expiration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>{t('templates.tip')}</strong>
        </p>
      </div>
    </div>
  );
}

MessageTemplates.propTypes = {
  onSelectTemplate: PropTypes.func.isRequired,
  onClose: PropTypes.func
};

export default MessageTemplates;
