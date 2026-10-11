# Property monitor

Telegram monitor for apartment purchase listings in Batumi: 1+1 or 2+1, up to
75,000 USD. It uses a personal MTProto session, reads only allowlisted source
chats and posts matches only to `NOTIFICATION_CHAT_ID`.

## Setup

1. Copy `.env.example` to `.env` and supply PostgreSQL plus Telegram API values.
2. Run `npm run property-monitor:login` locally. Save the printed session as
   `TELEGRAM_SESSION`; never commit it.
3. Add that Telegram account to the result group, then use
   `npm run property-monitor:chats` to find its ID and the source-chat IDs.
4. Deploy with the root `Dockerfile`. Configure all values in RelaxDev secrets.
