import { useTranslations } from 'next-intl';

export function SettingContent() {
  const t = useTranslations('settings');

  const settingsContent = (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-lg border p-6">
          <h2 className="mb-2 font-semibold text-xl">{t('profile.title')}</h2>
          <p className="mb-4 text-muted-foreground">{t('profile.description')}</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="font-medium text-sm">
                姓名
              </label>
              <input
                id="name"
                type="text"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                placeholder="输入您的姓名"
              />
            </div>
            <div>
              <label htmlFor="email" className="font-medium text-sm">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                placeholder="输入您的邮箱"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="mb-2 font-semibold text-xl">{t('security.title')}</h2>
          <p className="mb-4 text-muted-foreground">{t('security.description')}</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="current-password" className="font-medium text-sm">
                当前密码
              </label>
              <input
                id="current-password"
                type="password"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                placeholder="输入当前密码"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="font-medium text-sm">
                新密码
              </label>
              <input
                id="new-password"
                type="password"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                placeholder="输入新密码"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="mb-2 font-semibold text-xl">{t('notifications.title')}</h2>
          <p className="mb-4 text-muted-foreground">{t('notifications.description')}</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">邮件通知</p>
                <p className="text-muted-foreground text-sm">接收重要更新的邮件通知</p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">推送通知</p>
                <p className="text-muted-foreground text-sm">接收浏览器推送通知</p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return settingsContent;
}
