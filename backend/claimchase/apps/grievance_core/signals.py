"""
Signals for grievance_core app.
Handles Cloudinary file cleanup on document deletion.
"""
import cloudinary.uploader
import cloudinary.api
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from .models import Document


@receiver(pre_delete, sender=Document)
def delete_document_from_cloudinary(sender, instance, **kwargs):
    """
    Delete the file from Cloudinary when Document is deleted.
    Uses pre_delete to ensure file exists when we try to delete it.
    """
    if instance.file:
        try:
            # Get the public_id from the CloudinaryField
            public_id = instance.file.public_id
            if public_id:
                # Extract extension from URL if present
                file_url = instance.file.url
                print(f"File URL: {file_url}")
                print(f"CloudinaryField public_id: {public_id}")
                
                # For raw resource type, extract full filename with extension from URL
                # URL format: https://res.cloudinary.com/{cloud}/raw/upload/v{version}/{public_id}.ext
                if '/raw/upload/' in file_url and '.' in file_url:
                    # Extract everything after the version number
                    parts = file_url.split('/raw/upload/')
                    if len(parts) > 1:
                        # Remove version part (v1234567890/) and get the full path with extension
                        path_with_version = parts[1]
                        # Skip the version folder
                        if path_with_version.startswith('v'):
                            path_parts = path_with_version.split('/', 1)
                            if len(path_parts) > 1:
                                full_public_id = path_parts[1]
                                print(f"Extracted full public_id from URL: {full_public_id}")
                                
                                # Try with full path including extension for raw files
                                try:
                                    result = cloudinary.uploader.destroy(full_public_id, resource_type='raw', invalidate=True)
                                    print(f"Tried raw with extension '{full_public_id}': {result}")
                                    if result.get('result') == 'ok':
                                        print(f"✅ Successfully deleted: {full_public_id}")
                                        return
                                except Exception as e:
                                    print(f"Error: {str(e)}")
                
                # Fallback: Try multiple resource types
                resource_types = ['raw', 'image', 'video']
                
                for resource_type in resource_types:
                    # For images, strip file extension from public_id
                    deletion_id = public_id
                    if resource_type == 'image' and '.' in public_id:
                        deletion_id = public_id.rsplit('.', 1)[0]
                    
                    try:
                        result = cloudinary.uploader.destroy(deletion_id, resource_type=resource_type, invalidate=True)
                        print(f"Tried resource_type='{resource_type}' with public_id='{deletion_id}': {result}")
                        
                        if result.get('result') == 'ok':
                            print(f"✅ Successfully deleted document from Cloudinary with resource_type='{resource_type}': {deletion_id}")
                            return
                    except Exception as e:
                        print(f"Error with resource_type='{resource_type}': {str(e)}")
                        continue
                
                # If uploader.destroy didn't work, try Admin API delete_resources
                print(f"Trying Admin API delete_resources...")
                try:
                    result = cloudinary.api.delete_resources([public_id], resource_type='raw', invalidate=True)
                    print(f"Admin API result: {result}")
                    if result.get('deleted', {}).get(public_id) == 'deleted':
                        print(f"✅ Successfully deleted via Admin API: {public_id}")
                        return
                except Exception as e:
                    print(f"Admin API also failed: {str(e)}")
                
                print(f"⚠️ Failed to delete with any method. File might not exist in Cloudinary.")
                
        except Exception as e:
            print(f"Unexpected error during Cloudinary deletion: {str(e)}")