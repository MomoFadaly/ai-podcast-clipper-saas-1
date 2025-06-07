# Clips Data Integrity - Issue Prevention Guide

## 🚨 Critical Issue: Missing Chunks Data

### **What Happened**
- Processing completed successfully (status = "processed")
- Clips were created in database 
- BUT: `getProjectClips()` query was missing the `chunks` field
- **Result**: UI showed "No chunks available" even though clips existed

### **Root Cause**
The database query was manually selecting specific fields but forgot to include the **critical `chunks` field**:

```typescript
// ❌ BROKEN - Missing chunks field
select: {
  id: true,
  s3Key: true,
  // ... other fields
  // chunks: true, // <- THIS WAS MISSING!
}
```

### **Why This Is Critical**
- `chunks` contains timing data (start_time_seconds, end_time_seconds, duration_seconds)
- Without chunks data, clips can't be played or displayed properly
- UI falls back to "No chunks available" even when clips exist

## 🛡️ Prevention Measures Implemented

### **1. Comprehensive Database Query**
```typescript
// ✅ FIXED - Clear organization and comments
select: {
  // Core identifiers
  id: true,
  s3Key: true,
  uploadedFileId: true,
  userId: true,
  
  // Timestamps
  createdAt: true,
  updatedAt: true,
  
  // User progress data  
  isCompleted: true,
  completedAt: true,
  watchTime: true,
  
  // Media data
  thumbnailUrl: true,
  chunks: true, // CRITICAL: Contains timing, duration, and chunk metadata
  
  // Optional data
  ...(includeTranscription && { transcription: true }),
}
```

### **2. Better TypeScript Interfaces**
```typescript
// Clear interface with proper typing
export interface ChunkData {
  chunk_number: number;
  start_time_seconds: number;
  end_time_seconds: number; 
  duration_seconds: number;
}

export interface ClipWithDetails {
  // ... other fields
  chunks: ChunkData | null; // CRITICAL: Must be included
}
```

### **3. Runtime Validation (Backend)**
```typescript
// Validate clips before returning
const validatedClips = clips.map((clip) => {
  if (!clip.chunks) {
    console.error(`⚠️  MISSING CHUNKS DATA for clip ${clip.id}!`);
  }
  return clip;
});
```

### **4. Frontend Validation (React Query)**
```typescript
// Detect issues at frontend level
queryFn: async () => {
  const clips = await getProjectClips(projectId, options);
  
  const missingChunks = clips.filter(clip => !clip.chunks);
  if (missingChunks.length > 0) {
    console.error(`🚨 FRONTEND ALERT: ${missingChunks.length} clips missing chunks data!`);
  }
  
  return clips;
}
```

### **5. Data Integrity Checker**
```typescript
// Run periodically to catch issues
import { checkClipsDataIntegrity } from "~/lib/data-integrity";

const report = await checkClipsDataIntegrity(projectId);
// Returns: { totalClips, healthyClips, missingChunks, issues }
```

### **6. Debug Endpoint**
```bash
# Check specific project
curl "http://localhost:3000/api/debug/project-clips?projectId=PROJECT_ID"

# Returns detailed analysis including integrity report
```

## 🔍 How to Detect This Issue

### **Symptoms**
- Project shows "processed" status
- Shows "0 chunks" or "No chunks available"
- Clips exist in database but don't appear in UI
- Manual page refresh doesn't help

### **Quick Diagnosis**
1. Check browser console for validation errors
2. Use debug endpoint: `/api/debug/project-clips?projectId=PROJECT_ID`
3. Check Prisma Studio - do clips have `chunks` data?

### **In Code**
```typescript
// This will now log warnings:
const clips = await getProjectClips(projectId);
// Check console for "MISSING CHUNKS DATA" errors
```

## 🚀 Best Practices Going Forward

### **Database Queries**
- ✅ Always include `chunks` field when querying clips
- ✅ Use comprehensive field selection with comments
- ✅ Group fields logically (identifiers, timestamps, media data)

### **Testing**
- ✅ Run integrity checker after processing workflows
- ✅ Verify chunks data exists before marking processing complete
- ✅ Test with actual processed content, not just mock data

### **Monitoring**
- ✅ Watch for validation warnings in logs
- ✅ Use debug endpoint for troubleshooting
- ✅ Monitor for "No chunks available" user reports

## 🛠️ Recovery

If this happens again:

1. **Verify clips exist**: Check Prisma Studio Clip table
2. **Check chunks data**: Look for null/missing chunks field
3. **Use debug endpoint**: Get detailed analysis
4. **Re-run processing**: If clips missing chunks, trigger re-processing
5. **Manual fix**: Update chunks field with correct timing data

## 📝 Code Checklist

When working with clips:

- [ ] Include `chunks: true` in database queries
- [ ] Validate chunks data exists before using
- [ ] Use TypeScript interfaces with proper typing
- [ ] Test with real processed content
- [ ] Check browser console for validation warnings
- [ ] Run integrity checks periodically

---

**Remember**: The `chunks` field is CRITICAL for clips functionality. Without it, clips cannot be displayed or played properly, even if they exist in the database. 