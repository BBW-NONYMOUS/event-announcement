from sqlalchemy.orm import Session

from app.models import Settings

SETTINGS_ID = 1


def get_settings(db: Session) -> Settings:
    """The settings singleton, created on first read.

    The migration seeds row 1, but tests build their schema straight from the
    models and never run it — so the row has to be creatable on demand rather
    than assumed.
    """
    settings = db.get(Settings, SETTINGS_ID)
    if settings is None:
        settings = Settings(id=SETTINGS_ID)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings
