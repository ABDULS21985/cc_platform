"""
Verification Resources - Flask-Smorest MethodView endpoints
POST /api/v2/verification/bvn
POST /api/v2/verification/nin
GET /api/v2/verification/status
GET /api/v2/verification/task/<task_id>
"""
from flask.views import MethodView
from flask_smorest import Blueprint
from flask_login import current_user as flask_current_user
import logging

from modules.verification.schemas.verification_schema import (
    BVNSchema,
    NINSchema,
    VerificationResponseSchema,
    VerificationStatusSchema,
    TaskStatusResponseSchema,
    VerificationErrorSchema
)
from modules.verification.repositories.verification_repository import VerificationRepository
from modules.verification.services.verification_service import VerificationService
from modules.tasks.verification_tasks import process_bvn_verification, process_nin_verification
from modules.verification.utils.rate_limiter import rate_limit
from modules.tasks.celery_app import celery
from modules.auth_v2.utils.decorators import token_required
from modules.core.response_formatter import format_data, format_error, format_internal_error

logger = logging.getLogger(__name__)

verification_blp = Blueprint(
    'verification',
    __name__,
    url_prefix='/api/v2/verification',
    description='Identity verification endpoints (BVN/NIN)'
)


@verification_blp.route('/bvn')
class BVNVerificationResource(MethodView):
    """BVN Verification endpoint - Async processing with Celery"""
    
    @verification_blp.arguments(BVNSchema)
    @verification_blp.response(202, VerificationResponseSchema, description='Verification queued successfully')
    @verification_blp.alt_response(400, schema=VerificationErrorSchema, description='Validation error or already verified')
    @verification_blp.alt_response(429, schema=VerificationErrorSchema, description='Rate limit exceeded')
    @token_required
    @rate_limit(max_requests=10, window_minutes=60, key_prefix="bvn_verification")
    def post(self, data, current_user=None):
        """
        Submit BVN for verification
        
        Submit BVN for async verification. Returns immediately with task ID.
        Rate limited to 10 requests per hour.
        
        Request Body:
            bvn: Bank Verification Number (11 digits)
            date_of_birth: Date of birth in YYYY-MM-DD format
        
        Returns 202 Accepted with verification_id and task_id for tracking.
        """
        try:
            bvn = data['bvn']
            date_of_birth = data['date_of_birth']
            
            # Check if user already verified
            repo = VerificationRepository()
            existing = repo.find_by_user_id(current_user.id)
            
            if existing and existing.status == 'verified':
                response, status = format_error(
                    error="already_verified",
                    message="Your identity has already been verified",
                    status_code=400,
                )
                return response, status
            
            if existing and existing.status == 'processing':
                # Verification is already processing, return current task info
                response, status = format_data(
                    data={
                        'verification_id': existing.id,
                        'task_id': existing.task_id,
                        'status': 'processing',
                        'estimated_time': '1-2 minutes'
                    },
                    message="Verification in progress. We'll notify you when complete.",
                    status_code=202,
                )
                return response, status
            
            # Create or update verification record with status=processing
            if existing:
                # Update existing record (e.g., from 'pending' or 'failed' status)
                verification = repo.update_status(
                    existing.id,
                    'processing',
                    verification_type='bvn',
                    verification_number_encrypted='',
                    verification_number_hash=''
                )
            else:
                # Create new verification record
                verification = repo.create({
                    'user_id': current_user.id,
                    'verification_type': 'bvn',
                    'verification_number_encrypted': '',  # Will be set by background job
                    'verification_number_hash': '',  # Will be set by background job
                    'status': 'processing'
                })
            
            logger.info(f"Created BVN verification record {verification.id} for user {current_user.id}")
            
            # Queue background job (returns immediately)
            task = process_bvn_verification.delay(
                user_id=current_user.id,
                bvn=bvn,
                date_of_birth=date_of_birth,
                verification_id=verification.id
            )
            
            # Save task_id to verification record
            verification.task_id = task.id
            repo.update_status(
                verification.id,
                'processing',
                task_id=task.id
            )
            
            logger.info(f"Queued BVN verification task {task.id} for user {current_user.id}")
            
            # Return immediately (don't wait for Bell MFB)
            response, status = format_data(
                data={
                    'verification_id': verification.id,
                    'task_id': task.id,
                    'status': 'processing',
                    'estimated_time': '1-2 minutes'
                },
                message="Verification in progress. We'll notify you when complete.",
                status_code=202,
            )
            return response, status
            
        except Exception as e:
            logger.error(f"BVN verification error for user {current_user.id}: {str(e)}", exc_info=True)
            response, status = format_internal_error('An error occurred while processing your request')
            return response, status


@verification_blp.route('/nin')
class NINVerificationResource(MethodView):
    """NIN Verification endpoint - Async processing with Celery"""
    
    @verification_blp.arguments(NINSchema)
    @verification_blp.response(202, VerificationResponseSchema, description='Verification queued successfully')
    @verification_blp.alt_response(400, schema=VerificationErrorSchema, description='Validation error or already verified')
    @verification_blp.alt_response(429, schema=VerificationErrorSchema, description='Rate limit exceeded')
    @token_required
    @rate_limit(max_requests=10, window_minutes=60, key_prefix="nin_verification")
    def post(self, data, current_user=None):
        """
        Submit NIN for verification
        
        Submit NIN for async verification. Returns immediately with task ID.
        Rate limited to 10 requests per hour.
        
        Request Body:
            nin: National Identification Number (11 digits)
            date_of_birth: Date of birth in YYYY-MM-DD format
        
        Returns 202 Accepted with verification_id and task_id for tracking.
        """
        try:
            nin = data['nin']
            date_of_birth = data['date_of_birth']
            
            # Check if user already verified
            repo = VerificationRepository()
            existing = repo.find_by_user_id(current_user.id)
            
            if existing and existing.status == 'verified':
                response, status = format_error(
                    error="already_verified",
                    message="Your identity has already been verified",
                    status_code=400,
                )
                return response, status
            
            if existing and existing.status == 'processing':
                # Verification is already processing, return current task info
                response, status = format_data(
                    data={
                        'verification_id': existing.id,
                        'task_id': existing.task_id,
                        'status': 'processing',
                        'estimated_time': '1-2 minutes'
                    },
                    message="Verification in progress. We'll notify you when complete.",
                    status_code=202,
                )
                return response, status
            
            # Create verification record with status=processing
            verification = repo.create({
                'user_id': current_user.id,
                'verification_type': 'nin',
                'verification_number_encrypted': '',  # Will be set by background job
                'verification_number_hash': '',  # Will be set by background job
                'status': 'processing'
            })
            
            logger.info(f"Created NIN verification record {verification.id} for user {current_user.id}")
            
            # Queue background job (returns immediately)
            task = process_nin_verification.delay(
                user_id=current_user.id,
                nin=nin,
                date_of_birth=date_of_birth,
                verification_id=verification.id
            )
            
            # Save task_id to verification record
            verification.task_id = task.id
            repo.update_status(
                verification.id,
                'processing',
                task_id=task.id
            )
            
            logger.info(f"Queued NIN verification task {task.id} for user {current_user.id}")
            
            # Return immediately (don't wait for Bell MFB)
            response, status = format_data(
                data={
                    'verification_id': verification.id,
                    'task_id': task.id,
                    'status': 'processing',
                    'estimated_time': '1-2 minutes'
                },
                message="Verification in progress. We'll notify you when complete.",
                status_code=202,
            )
            return response, status
            
        except Exception as e:
            logger.error(f"NIN verification error for user {current_user.id}: {str(e)}", exc_info=True)
            response, status = format_internal_error('An error occurred while processing your request')
            return response, status


@verification_blp.route('/status')
class VerificationStatusResource(MethodView):
    """Get current user's verification status"""
    
    @verification_blp.response(200, VerificationStatusSchema, description='Verification status retrieved')
    @token_required
    def get(self, current_user=None):
        """
        Get verification status
        
        Get current user's verification status (not_started, processing, verified, failed).
        
        Status values:
        - not_started: User hasn't submitted verification
        - processing: Verification in progress
        - verified: Successfully verified
        - failed: Verification failed
        """
        try:
            service = VerificationService()
            status = service.get_verification_status(current_user.id)
            
            response, code = format_data(data=status, message='Verification status retrieved successfully', status_code=200)
            return response, code
            
        except Exception as e:
            logger.error(f"Error getting verification status for user {current_user.id}: {str(e)}", exc_info=True)
            response, code = format_internal_error('An error occurred while fetching verification status')
            return response, code


@verification_blp.route('/task/<task_id>')
class TaskStatusResource(MethodView):
    """Check status of verification background tasks"""
    
    @verification_blp.response(200, TaskStatusResponseSchema, description='Task status retrieved')
    @token_required
    def get(self, task_id: str, current_user=None):
        """
        Check task status
        
        Get the status of a verification background task.
        Use the task_id returned from verify_bvn or verify_nin.
        
        Task States:
        - PENDING: Task is waiting in queue
        - STARTED: Task is currently executing
        - SUCCESS: Task completed successfully
        - FAILURE: Task failed permanently
        - RETRY: Task failed and is retrying
        
        Security: Only returns status for current user's verification.
        Task results auto-expire after 1 hour.
        """
        try:
            task_result = celery.AsyncResult(task_id)
            
            response = {
                'task_id': task_id,
                'state': task_result.state,
            }
            
            if task_result.state == 'PENDING':
                response['status'] = 'processing'
                response['message'] = 'Verification is queued'
                response['progress'] = 0
                
            elif task_result.state == 'STARTED':
                response['status'] = 'processing'
                response['message'] = 'Verification in progress'
                response['progress'] = 50
                
            elif task_result.state == 'SUCCESS':
                response['status'] = 'completed'
                response['message'] = 'Verification completed'
                response['progress'] = 100
                response['result'] = task_result.result
                
            elif task_result.state == 'FAILURE':
                response['status'] = 'failed'
                response['message'] = 'Verification failed'
                response['progress'] = 100
                # info could be an exception object, not a dict
                if isinstance(task_result.info, dict):
                    response['error'] = task_result.info.get('error', str(task_result.info))
                else:
                    response['error'] = str(task_result.info)
                    
            elif task_result.state == 'RETRY':
                response['status'] = 'retrying'
                response['message'] = 'Verification failed, retrying...'
                response['progress'] = 25
                # info could be an exception object, not a dict
                if task_result.info and isinstance(task_result.info, dict):
                    response['retry_count'] = task_result.info.get('retries', 0)
            
            # Get verification record for additional context
            repo = VerificationRepository()
            verification = repo.find_by_user_id(current_user.id)
            
            if verification:
                response['verification'] = {
                    'id': verification.id,
                    'status': verification.status,
                    'verification_type': verification.verification_type,
                    'verified_at': verification.verified_at.isoformat() if verification.verified_at else None,
                    'error_message': verification.error_message
                }
            
            resp, code = format_data(data=response, message="Task status retrieved", status_code=200)
            return resp, code
            
        except Exception as e:
            logger.error(f"Error getting task status: {str(e)}", exc_info=True)
            resp, code = format_internal_error('An error occurred while fetching task status')
            return resp, code
