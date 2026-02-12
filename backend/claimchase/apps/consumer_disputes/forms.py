"""
Custom forms for Consumer Disputes admin.
"""
from django import forms
from django.contrib import admin
from .models import ConsumerDispute, DisputeDocument
from .expert_models import DisputeAssignment, DisputeDocumentReview


class DisputeAssignmentAdminForm(forms.ModelForm):
    """Custom form for Dispute Assignment with filtered document selection."""
    
    documents = forms.ModelMultipleChoiceField(
        queryset=DisputeDocument.objects.none(),
        required=False,
        widget=admin.widgets.FilteredSelectMultiple('Documents', False),
        help_text="Select documents from this dispute for expert review"
    )
    
    class Meta:
        model = DisputeAssignment
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # If dispute is selected, filter documents to only that dispute
        if 'dispute' in self.data:
            try:
                dispute_id = int(self.data.get('dispute'))
                self.fields['documents'].queryset = DisputeDocument.objects.filter(
                    dispute_id=dispute_id
                ).order_by('uploaded_at')
            except (ValueError, TypeError):
                pass
        elif self.instance.pk and self.instance.dispute:
            self.fields['documents'].queryset = DisputeDocument.objects.filter(
                dispute=self.instance.dispute
            ).order_by('uploaded_at')
            
            # Pre-select documents that already have reviews
            self.fields['documents'].initial = DisputeDocument.objects.filter(
                expert_reviews__assignment=self.instance
            )
    
    def save(self, commit=True):
        """Save the form and store document data for later processing."""
        # Call parent save
        instance = super().save(commit=commit)
        
        # Store cleaned documents for processing in _save_documents
        if commit:
            self._save_documents()
        else:
            # Store for later when _save_documents is called from admin
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
        
        # Get existing review documents
        existing_docs = set(
            DisputeDocument.objects.filter(
                expert_reviews__assignment=self.instance
            ).values_list('id', flat=True)
        )
        
        # Add new documents (create DisputeDocumentReview for each)
        for doc in selected_docs:
            if doc.id not in existing_docs:
                DisputeDocumentReview.objects.create(
                    assignment=self.instance,
                    document=doc,
                    status='pending'
                )
        
        # Remove deselected documents
        selected_ids = set(doc.id for doc in selected_docs)
        to_remove = existing_docs - selected_ids
        if to_remove:
            DisputeDocumentReview.objects.filter(
                assignment=self.instance,
                document_id__in=to_remove
            ).delete()
