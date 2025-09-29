from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# Add the parent directory to Python path so we can import the app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

config = context.config

if config.config_file_name is not None:
	fileConfig(config.config_file_name)

from app.models import Base  # noqa
from app.core.settings import settings

target_metadata = Base.metadata

def get_url():
	return settings.DB_URL


def run_migrations_offline():
	url = get_url()
	context.configure(
		url=url,
		target_metadata=target_metadata,
		literal_binds=True,
		compare_type=True,
	)

	with context.begin_transaction():
		context.run_migrations()


def run_migrations_online():
	connectable = engine_from_config(
		config.get_section(config.config_ini_section, {}),
		prefix="sqlalchemy.",
		poolclass=pool.NullPool,
		url=get_url(),
	)

	with connectable.connect() as connection:
		context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

		with context.begin_transaction():
			context.run_migrations()


if context.is_offline_mode():
	run_migrations_offline()
else:
	run_migrations_online()


