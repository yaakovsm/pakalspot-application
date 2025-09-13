import boto3
from botocore.client import Config
from datetime import timedelta
from ..core.settings import settings


def s3_client():
	return boto3.client(
		"s3",
		endpoint_url=settings.S3_ENDPOINT,
		aws_access_key_id=settings.S3_ACCESS_KEY,
		aws_secret_access_key=settings.S3_SECRET_KEY,
		region_name=settings.S3_REGION if hasattr(settings, "S3_REGION") else "us-east-1",
		config=Config(signature_version="s3v4"),
	)


def create_presigned_put_url(object_key: str, expires_seconds: int = 900) -> str:
	client = s3_client()
	return client.generate_presigned_url(
		"put_object",
		Params={"Bucket": settings.S3_BUCKET, "Key": object_key},
		ExpiresIn=expires_seconds,
	)


def create_presigned_get_url(object_key: str, expires_seconds: int = 900) -> str:
	client = s3_client()
	return client.generate_presigned_url(
		"get_object",
		Params={"Bucket": settings.S3_BUCKET, "Key": object_key},
		ExpiresIn=expires_seconds,
	)


