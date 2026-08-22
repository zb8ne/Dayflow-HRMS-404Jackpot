package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"dayflow/backend/ask"
	"dayflow/backend/identity"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx := context.Background()
	if _, err := jwtSecret(); err != nil {
		log.Fatalf("auth config: %v", err)
	}
	pool, err := initPool(ctx)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	redisClient, err := initRedis(ctx)
	if err != nil {
		log.Fatalf("redis connect: %v", err)
	}
	defer redisClient.Close()
	sessions = NewSessionManager(redisClient, accessTokenTTL)
	mailer, err := newMailerFromEnv()
	if err != nil {
		log.Fatalf("email config: %v", err)
	}

	if err := runMigrations(ctx, pool); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	askHandler, err := ask.NewHandler(pool, ask.NewGroqSelector(), "http://localhost:8080", "audit.jsonl")
	if err != nil {
		log.Fatalf("ask handler: %v", err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// HRMS: auth
	mux.HandleFunc("/auth/signup", signupHandler(pool))
	mux.HandleFunc("/auth/signin", signinHandler(pool, mailer))
	mux.HandleFunc("/auth/verify", verifyHandler(pool))
	mux.HandleFunc("/auth/logout", logoutHandler())
	mux.HandleFunc("/auth/me", meHandler(pool))
	mux.HandleFunc("/auth/sessions", sessionsHandler())
	mux.HandleFunc("/auth/logout-all", logoutAllHandler())
	mux.HandleFunc("/auth/set-password", activateEmployeeHandler(pool))

	// HRMS: profile
	mux.HandleFunc("/api/employees", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			createEmployeeHandler(pool, mailer)(w, r)
			return
		}
		listEmployeesHandler(pool)(w, r)
	})
	mux.HandleFunc("/api/employees/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			deleteEmployeeHandler(pool)(w, r)
			return
		}
		writeError(w, http.StatusMethodNotAllowed, "use DELETE /api/employees/:id")
	})
	mux.HandleFunc("/api/profile/me", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			patchMyProfileHandler(pool)(w, r)
			return
		}
		getMyProfileHandler(pool)(w, r)
	})
	mux.HandleFunc("/api/profile/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			patchProfileByIDHandler(pool)(w, r)
			return
		}
		getProfileByIDHandler(pool)(w, r)
	})

	// HRMS: attendance
	mux.HandleFunc("/api/attendance/checkin", checkinHandler(pool))
	mux.HandleFunc("/api/attendance/checkout", checkoutHandler(pool))
	mux.HandleFunc("/api/attendance/me", getMyAttendanceHandler(pool))
	mux.HandleFunc("/api/attendance/all", getAllAttendanceHandler(pool))
	mux.HandleFunc("/api/attendance/override", overrideAttendanceHandler(pool))
	mux.HandleFunc("/api/attendance/", getAttendanceByIDHandler(pool))

	// HRMS: leave
	mux.HandleFunc("/api/leave/me", getMyLeaveHandler(pool))
	mux.HandleFunc("/api/leave/all", getAllLeaveHandler(pool))
	mux.HandleFunc("/api/leave", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			applyLeaveHandler(pool)(w, r)
			return
		}
		writeError(w, http.StatusMethodNotAllowed, "use POST /api/leave")
	})
	mux.HandleFunc("/api/leave/", reviewLeaveHandler(pool))

	// HRMS: payroll
	mux.HandleFunc("/api/payroll/me", getMyPayrollHandler(pool))
	mux.HandleFunc("/api/payroll/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			patchPayrollByIDHandler(pool)(w, r)
			return
		}
		getPayrollByIDHandler(pool)(w, r)
	})

	mux.HandleFunc("/api/digest", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		start, end, err := windowFromReq(r)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		startStr := start.Format("2006-01-02")
		endStr := end.AddDate(0, 0, -1).Format("2006-01-02")

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		bundle, err := ask.BuildFactBundle(ctx, pool, startStr, endStr)
		if err != nil {
			log.Printf("digest: bundle: %v", err)
			http.Error(w, `{"error":"digest failed"}`, http.StatusInternalServerError)
			return
		}
		res, err := identity.Load(ctx, pool)
		if err != nil {
			log.Printf("digest: identity: %v", err)
			http.Error(w, `{"error":"digest failed"}`, http.StatusInternalServerError)
			return
		}
		text, source := ask.DigestText(ctx, bundle, res)
		json.NewEncoder(w).Encode(map[string]any{
			"digest": text,
			"source": source,
			"facts":  bundle,
		})
	})

	mux.HandleFunc("/api/active-dates", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		month := r.URL.Query().Get("month") // YYYY-MM
		if month == "" {
			http.Error(w, `{"error":"month required"}`, http.StatusBadRequest)
			return
		}
		loc, _ := time.LoadLocation(timezone)
		start, err := time.ParseInLocation("2006-01", month, loc)
		if err != nil {
			http.Error(w, `{"error":"bad month"}`, http.StatusBadRequest)
			return
		}
		end := start.AddDate(0, 1, 0)
		rows, err := pool.Query(r.Context(),
			`select distinct (accessed_at at time zone $1)::date::text
			 from gatepoint_events
			 where event_type='authorised_access' and accessed_at>=$2 and accessed_at<$3
			 order by 1`,
			timezone, start, end)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var dates []string
		for rows.Next() {
			var d string
			if err := rows.Scan(&d); err != nil {
				http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
				return
			}
			dates = append(dates, d)
		}
		if err := rows.Err(); err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		if dates == nil {
			dates = []string{}
		}
		json.NewEncoder(w).Encode(map[string]any{"dates": dates})
	})

	mux.HandleFunc("/summary", func(w http.ResponseWriter, r *http.Request) {
		rangeParam := r.URL.Query().Get("range")
		if rangeParam != "daily" && rangeParam != "weekly" {
			rangeParam = "daily"
		}
		// With no date chosen, anchor to the most recent event rather than to
		// now: the data set ends whenever the export ended, and today is
		// usually past it, which would open the dashboard on an empty day.
		ref := latestEvent(r.Context(), pool)
		if d := r.URL.Query().Get("date"); d != "" {
			loc, _ := time.LoadLocation(timezone)
			if t, err := time.ParseInLocation("2006-01-02", d, loc); err == nil {
				ref = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			}
		}
		resp, err := buildSummary(r.Context(), pool, rangeParam, ref)
		if err != nil {
			log.Printf("buildSummary: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	mux.HandleFunc("/api/q/user-entries", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		userID, err := strconv.ParseInt(r.URL.Query().Get("org_user_id"), 10, 64)
		if err != nil || userID <= 0 {
			http.Error(w, `{"error":"invalid org_user_id"}`, http.StatusBadRequest)
			return
		}
		start, end, err := windowFromReq(r)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		json.NewEncoder(w).Encode(queryUserEntries(r.Context(), pool, userID, start, end))
	})

	mux.HandleFunc("/api/q/org-summary", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		start, end, err := windowFromReq(r)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		var active, total, totalUsers, totalDoors, silentDoors, peakHour int
		pool.QueryRow(r.Context(),
			`select count(distinct user_id), count(*) from gatepoint_events
			 where event_type='authorised_access' and accessed_at>=$1 and accessed_at<$2`,
			start, end).Scan(&active, &total)
		pool.QueryRow(r.Context(), `select count(distinct user_id) from gatepoint_events where event_type='authorised_access'`).Scan(&totalUsers)
		pool.QueryRow(r.Context(), `select count(distinct access_point_id) from gatepoint_events where event_type='authorised_access'`).Scan(&totalDoors)
		pool.QueryRow(r.Context(),
			`select count(distinct access_point_id) from gatepoint_events ap
			 where event_type='authorised_access'
			 and not exists (select 1 from gatepoint_events e2 where e2.access_point_id=ap.access_point_id
			   and e2.event_type='authorised_access' and e2.accessed_at>=$1 and e2.accessed_at<$2)`,
			start, end).Scan(&silentDoors)
		pool.QueryRow(r.Context(),
			`select extract(hour from accessed_at at time zone $1)::int from gatepoint_events
			 where event_type='authorised_access' and accessed_at>=$2 and accessed_at<$3
			 group by 1 order by count(*) desc limit 1`,
			timezone, start, end).Scan(&peakHour)
		json.NewEncoder(w).Encode(map[string]any{
			"active_users":  active,
			"total_users":   totalUsers,
			"total_entries": total,
			"total_doors":   totalDoors,
			"silent_doors":  silentDoors,
			"peak_hour":     peakHour,
		})
	})

	mux.HandleFunc("/api/q/hourly-breakdown", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		start, end, err := windowFromReq(r)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		rows, err := pool.Query(r.Context(),
			`select extract(hour from accessed_at at time zone $1)::int, count(*)
			 from gatepoint_events
			 where event_type='authorised_access' and accessed_at>=$2 and accessed_at<$3
			 group by 1 order by 1`,
			timezone, start, end)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var buckets []map[string]any
		for rows.Next() {
			var h, c int
			rows.Scan(&h, &c)
			buckets = append(buckets, map[string]any{"hour": h, "count": c})
		}
		if buckets == nil {
			buckets = []map[string]any{}
		}
		json.NewEncoder(w).Encode(map[string]any{"buckets": buckets})
	})

	mux.HandleFunc("/api/q/top-users", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		start, end, err := windowFromReq(r)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit <= 0 {
			limit = 10
		}
		rows, err := pool.Query(r.Context(),
			`select user_id, count(*) as cnt
			 from gatepoint_events
			 where event_type='authorised_access' and accessed_at>=$1 and accessed_at<$2
			 group by user_id order by cnt desc limit $3`,
			start, end, limit)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var items []map[string]any
		for rows.Next() {
			var uid int64
			var cnt int
			rows.Scan(&uid, &cnt)
			items = append(items, map[string]any{"org_user_id": uid, "count": cnt})
		}
		if items == nil {
			items = []map[string]any{}
		}
		json.NewEncoder(w).Encode(map[string]any{"items": items})
	})

	mux.HandleFunc("/api/q/top-doors", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		start, end, err := windowFromReq(r)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit <= 0 {
			limit = 10
		}
		rows, err := pool.Query(r.Context(),
			`select access_point_id, access_point_name, count(*) as cnt
			 from gatepoint_events
			 where event_type='authorised_access' and accessed_at>=$1 and accessed_at<$2
			 group by access_point_id, access_point_name order by cnt desc limit $3`,
			start, end, limit)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var items []map[string]any
		for rows.Next() {
			var apid int64
			var name string
			var cnt int
			rows.Scan(&apid, &name, &cnt)
			items = append(items, map[string]any{"access_point_id": apid, "serial_name": name, "count": cnt})
		}
		if items == nil {
			items = []map[string]any{}
		}
		json.NewEncoder(w).Encode(map[string]any{"items": items})
	})

	mux.HandleFunc("/api/q/user-list", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		rows, err := pool.Query(r.Context(),
			`select distinct user_id from gatepoint_events where event_type='authorised_access' order by user_id`)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var items []map[string]any
		for rows.Next() {
			var uid int64
			rows.Scan(&uid)
			items = append(items, map[string]any{"org_user_id": uid})
		}
		json.NewEncoder(w).Encode(map[string]any{"items": items})
	})

	mux.HandleFunc("/api/q/door-list", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		rows, err := pool.Query(r.Context(),
			`select distinct access_point_id, access_point_name from gatepoint_events
			 where event_type='authorised_access' order by access_point_id`)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var items []map[string]any
		for rows.Next() {
			var apid int64
			var name string
			rows.Scan(&apid, &name)
			items = append(items, map[string]any{"access_point_id": apid, "serial_name": name})
		}
		json.NewEncoder(w).Encode(map[string]any{"items": items})
	})

	mux.HandleFunc("/api/active-users", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		start, end, err := windowFromReq(r)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		var rawJSON string
		err = pool.QueryRow(r.Context(),
			`select coalesce(json_agg(u order by u.entries desc), '[]'::json)
			 from (
			   select user_name,
			          count(*)                                as entries,
			          min(accessed_at at time zone $1)::text as first_entry,
			          max(accessed_at at time zone $1)::text as last_entry
			   from gatepoint_events
			   where event_type='authorised_access' and accessed_at>=$2 and accessed_at<$3
			   group by user_name
			 ) u`,
			timezone, start, end).Scan(&rawJSON)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		fmt.Fprintf(w, `{"users":%s}`, rawJSON)
	})

	mux.HandleFunc("/api/activity-log", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		start, end, err := windowFromReq(r)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		var rawJSON string
		err = pool.QueryRow(r.Context(),
			`select coalesce(json_agg(e order by e.time), '[]'::json)
			 from (
			   select user_name,
			          access_point_name                                       as door_name,
			          (accessed_at at time zone $1)::text                     as time,
			          coalesce(nullif(mobile_access_mode,''), nullif(access_type,''), 'unknown') as access_method
			   from gatepoint_events
			   where event_type='authorised_access' and accessed_at>=$2 and accessed_at<$3
			 ) e`,
			timezone, start, end).Scan(&rawJSON)
		if err != nil {
			http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
			return
		}
		fmt.Fprintf(w, `{"events":%s}`, rawJSON)
	})

	mux.Handle("/ask", askHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(mux)))
}

func queryUserEntries(ctx context.Context, pool *pgxpool.Pool, userID int64, start, end time.Time) map[string]any {
	var count int
	var first, last *time.Time
	pool.QueryRow(ctx,
		`select count(*), min(accessed_at), max(accessed_at)
		 from gatepoint_events
		 where event_type='authorised_access' and user_id=$1 and accessed_at>=$2 and accessed_at<$3`,
		userID, start, end,
	).Scan(&count, &first, &last)

	loc, _ := time.LoadLocation(timezone)
	res := map[string]any{"org_user_id": userID, "count": count, "by_day": []any{}}
	if first != nil {
		res["first_entry"] = first.In(loc).Format(time.RFC3339)
		res["last_entry"] = last.In(loc).Format(time.RFC3339)
	}
	return res
}

func windowFromReq(r *http.Request) (time.Time, time.Time, error) {
	loc, _ := time.LoadLocation(timezone)
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")
	if startStr == "" || endStr == "" {
		return time.Time{}, time.Time{}, fmt.Errorf("start and end required")
	}
	start, err := time.ParseInLocation("2006-01-02", startStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("bad start")
	}
	end, err := time.ParseInLocation("2006-01-02", endStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("bad end")
	}
	return start, end.AddDate(0, 0, 1), nil
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigin := os.Getenv("FRONTEND_ORIGIN")
		if origin != "" && origin != allowedOrigin &&
			(r.Method == http.MethodPost || r.Method == http.MethodPatch || r.Method == http.MethodDelete || r.Method == http.MethodOptions) {
			writeError(w, http.StatusForbidden, "origin not allowed")
			return
		}
		if origin != "" && origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
