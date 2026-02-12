"""
Custom forms for Medical Review admin.
"""
from django import forms
from django.contrib import admin
from claimchase.apps.grievance_core.models import Document
from .models import ReviewAssignment, AssignmentDocument


class ReviewAssignmentAdminForm(forms.ModelForm):
    """Custom form for Review Assignment with filtered document selection."""
    
    documents = forms.ModelMultipleChoiceField(
        queryset=Document.objects.none(),
        required=False,
        widget=admin.widgets.FilteredSelectMultiple('Documents', False),
        help_text="Select documents from this case for medical review"
    )
    
    class Meta:
        model = ReviewAssignment
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # If case is selected, filter documents to only that case
        if 'case' in self.data:
            try:
                case_id = int(self.data.get('case'))
                self.fields['documents'].queryset = Document.objects.filter(
                    case_id=case_id
                ).order_by('-created_at')
            except (ValueError, TypeError):
                pass
        elif self.instance.pk and self.instance.case:
            self.fields['documents'].queryset = Document.objects.filter(
                case=self.instance.case
            ).order_by('-created_at')
            
            # Pre-select documents that are already in this assignment
            # Use the correct related_name: review_assignments
            self.fields['documents'].initial = Document.objects.filter(
                review_assignments__assignment=self.instance
            )
    
    def save(self, commit=True):
        """Save the form and store document data for later processing."""
        # Call parent save
        instance = super().save(commit=commit)
        
        # Store cleaned documents for processing in _save_m2m
        if commit:
            self._save_documents()
        else:
            # Store for later when save_m2m is called
            self._documents_to_save = self.cleaned_data.get('documents', [])
        
        return instance
    
    def _save_documents(self):
        """Process and save the documents relationship."""
        if not self.instance.pk:
            return
        
        # Get documents from cleaned_data or stored value
        if hasattr(self, '_documents_to_save'):
            selected_docs = self._documents_to_save
        elif 'documents' in self.cleaned_data:
            selected_docs = self.cleaned_data['documents']
        else:
            return
        
        # Get existing assignment documents
        existing_docs = set(
            Document.objects.filter(
                review_assignments__assignment=self.instance
            ).values_list('id', flat=True)
        )
        
        # Add new documents (create AssignmentDocument for each)
        for doc in selected_docs:
            if doc.id not in existing_docs:
                AssignmentDocument.objects.create(
                    assignment=self.instance,
                    document=doc
                )
        
        # Remove deselected documents
        selected_ids = set(doc.id for doc in selected_docs)
        to_remove = existing_docs - selected_ids
        if to_remove:
            AssignmentDocument.objects.filter(
                assignment=self.instance,
                document_id__in=to_remove
            ).delete()
