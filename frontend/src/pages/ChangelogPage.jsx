import { useEffect } from 'react';
import { Calendar, Package, CheckCircle, Code, Shield, Wrench } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import changelogMarkdown from '../../../CHANGELOG.md?raw';
import { parseChangelog, getVersionStatus, formatDate } from '../utils/parseChangelog';

// The page renders CHANGELOG.md itself, so it can never fall behind the released version
const versions = parseChangelog(changelogMarkdown).map((v) => ({ ...v, date: formatDate(v.date) }));

function VersionCard({ version, date, title, features, technical, security, changed, fixed, status = 'released' }) {
  const { t } = useI18n();
  const statusColors = {
    released: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    beta: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    planned: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200 border-l-4 border-primary-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{version}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">{date}</span>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{title}</h4>

      {features && features.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {t('changelog.sectionFeatures')}
          </h5>
          <ul className="space-y-1">
            {features.map((feature) => (
              <li key={feature} className="[overflow-wrap:anywhere] text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-primary-500 mt-1">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {technical && technical.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Code className="w-4 h-4" />
            {t('changelog.sectionTechnical')}
          </h5>
          <ul className="space-y-1">
            {technical.map((item) => (
              <li key={item} className="[overflow-wrap:anywhere] text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <span className="text-gray-400 mt-1">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {security && security.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            {t('changelog.sectionSecurity')}
          </h5>
          <ul className="space-y-1">
            {security.map((item) => (
              <li key={item} className="[overflow-wrap:anywhere] text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <span className="text-red-400 mt-1">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {changed && changed.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-500" />
            {t('changelog.sectionChanged')}
          </h5>
          <ul className="space-y-1">
            {changed.map((item) => (
              <li key={item} className="[overflow-wrap:anywhere] text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <span className="text-blue-400 mt-1">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fixed && fixed.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {t('changelog.sectionFixed')}
          </h5>
          <ul className="space-y-1">
            {fixed.map((item) => (
              <li key={item} className="[overflow-wrap:anywhere] text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <span className="text-green-400 mt-1">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChangelogPage() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = 'Changelog - NoteBurner';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('changelog.title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t('changelog.subtitle')}
          </p>
        </div>

        {/* Changelog Entries */}
        <div className="space-y-8">
          {versions.map((v) => (
            <VersionCard key={v.version} {...v} status={getVersionStatus(v)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChangelogPage;
