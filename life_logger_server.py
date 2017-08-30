"""
Hongjian Wang
10/12/2016

Lifelogger server.

Retrieve data from the following services:
1. Moves
2. Rescue Time
3. Fitbit
"""


from flask import Flask, render_template, session, request, url_for, redirect, g
from oauth import moves_oauth_server, rescuetime_oauth_server, fitbit_oauth_server, authorizationHeader
import requests
import sqlite3
import ssl
import json
from functools import wraps

from datetime import datetime, timedelta
from time import gmtime, strftime

import os
here = os.path.dirname(os.path.abspath(__file__))

context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
context.load_cert_chain('ssl-key/domain.crt', 'ssl-key/domain.key')


app = Flask(__name__)
app.secret_key = "lifelogger"

DATABASE = here + '/db/lifelogger.db'
SERVERNAME = "https://dsquare.ist.psu.edu/lifelogger/"
DEVSERVERNAME = "https://174.59.223.235:9293/"
SERVERNAME = DEVSERVERNAME


rescuetime = rescuetime_oauth_server(app)
moves = moves_oauth_server(app)
fitbit = fitbit_oauth_server(app)


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
    return db
    

@app.route("/user_register", methods=['POST'])
def user_register():
    user = request.form.get("name")
    password = request.form.get("password")
    try:
        db = get_db()
        db.execute('insert into users (name, password) values ("{0}", "{1}");'.format(user, password))
        db.commit()
        return login("Register successfully. Please login.")
    except sqlite3.Error as er:
        return login(er.message)
    

@app.route("/check_auth", methods=['POST'])    
def check_auth():
    """
    Authenticate the login credential.
    
    If valid, login user and get Oauth tokens for Moves, Rescuetime.
    Otherwise, redirect to login page and ask user to retry.
    """
    user = request.form.get("name")
    password = request.form.get("password")
    db = get_db()
    res = db.execute('select userid from users where name="{0}" and password="{1}"; '.format(user, password))
    r = res.fetchall()
    if len(r) == 1:
        session['uid'] = r[0][0]
        session['uname'] = user
        # get Oauth login credentials
        moves_login()
        rescuetime_login()
        fitbit_login()
        return redirect(url_for("index"))
    else:
        return login("Wrong username or password. Please try again.")


def requires_auth(f):
    """
    My decorator for login check.
    
    If the session['uid'] exists, then the user is logged in.
    Otherwise, redirect user to login page.
    """
    @wraps(f)
    def wrapper(*args, **kwds):
        if 'uid' not in session:
            return login("You are not logged in yet. Please log in")
        return f(*args, **kwds)
    return wrapper
    
        

@app.route("/login")
def login(message=""):
    return render_template("login.html", message=message)


@app.route("/home")
@requires_auth
def index():
    print session["uid"], "start at", strftime("%Y-%m-%d %H:%M:%S", gmtime())
    return render_template("index.html")


@app.route("/logout")
@requires_auth
def logout():
    session.clear()
    return login("You have successfully logged out!")

"""
========================================
Moves app
1. Oauth authorization
2. Query data
======================================== 
"""
@app.route("/moves")
@requires_auth
def moves_login():
    # check whether current user has already registered the Moves app
    db = get_db()
    res = db.execute('select * from moves where uid="{0}";'.format(session['uid']))
    r = res.fetchone()
    if r is None:
        print "Authentication on Moves server"
        return moves.authorize(callback= SERVERNAME + "moves_oauth_accept")
    else:
        session['moves_token'] = r[1]
        session['moves_user_id'] = r[2]
        session['moves_refresh_token'] = r[3]
        return json.dumps(r)
    

@app.route("/moves_oauth_accept")
@requires_auth
def moves_oauth_accept():
    print request
    res = moves.authorized_response()
    if res is None:
        return "Access denied. Error message {0}".format(request.args["error"])
    else:
        session['moves_token'] = res['access_token']
        session['moves_user_id'] = res['user_id']
        session['moves_refresh_token'] = res['refresh_token']
        db = get_db()
        db.execute('insert into moves (uid, moves_token, moves_user_id, moves_refresh_token) values \
                         ("{0}", "{1}", "{2}", "{3}");'.format(session['uid'], session['moves_token'], 
                             session['moves_user_id'], session['moves_refresh_token']))
        db.commit()
        return "User ID: {0}. Access token {1}".format(res['user_id'], res['access_token'])
        

@moves.tokengetter
def get_moves_token(token=None):
    return session["moves_token"]
        
        
@app.route("/moves_places/<dateStr>")
@requires_auth
def get_moves_places(dateStr):
    """
    The dateStr format is yyyyMMdd.
    If only pass yyyyMM, then monthly summary is provided.
    """
    if 'moves_user_id' not in session:
        return redirect(url_for('moves_login'))
    else:
        url = "https://api.moves-app.com/api/1.1/user/places/daily/{0}?access_token={1}".format(
                dateStr, session['moves_token'])
        print url
        res = json.loads(requests.get(url).content)
        res_dateStr = res[0]['date']
        res_points = res[0]['segments']
        respnd = []
        if res_points is not None:
            for point in res_points:
                ts = 0 if point['startTime'][0:8] < res_dateStr else int(point['startTime'][9:11])
                es = 23 if point['endTime'][0:8] > res_dateStr else int(point['endTime'][9:11])
                poi_label = reverseGeocoding(point['place']['location']['lat'], point['place']['location']['lon'])[0]
                respnd.append([ts, es, poi_label])
        return json.dumps(respnd)
            



def reverseGeocoding(lat, lon):
    url = "https://maps.googleapis.com/maps/api/geocode/json?latlng={0},{1}&key=AIzaSyCExfI5XMCBLPBah6X-_oZj29pqWjaa3Ls".format(
            lat, lon)
    jsonStr = requests.get(url).content
    res = json.loads(jsonStr)
    addr = res['results'][0]['formatted_address']
    addr_types = res['results'][0]['types']
    addr_loc = res['results'][0]['geometry']['location']
    return addr, addr_loc, addr_types



"""
========================================
RescueTime app
1. Oauth authorization
2. Query data
======================================== 
"""
@app.route("/rescuetime")
@requires_auth
def rescuetime_login():
    db = get_db()
    res = db.execute('select * from rescuetime where uid="{0}";'.format(session['uid']))
    r = res.fetchone()
    if r is None:
        return rescuetime.authorize(callback= SERVERNAME+"rescuetime_oauth_accept")
    else:
        session['rescuetime_token'] = r[1]
        return json.dumps(r)
    
    
@app.route("/rescuetime_oauth_accept")
@requires_auth
def rescuetime_oauth_accept():
    print request
    res = rescuetime.authorized_response()
    if res is None:
        return "Access denied. Error message {0}".format(request.args["error"])
    else:
        session['rescuetime_token'] = res['access_token']
        db = get_db()
        db.execute('insert into rescuetime (uid, rescuetime_token) values ("{0}", "{1}");'.format(
                   session['uid'], session['rescuetime_token']))
        db.commit()
        return json.dumps(res)


@rescuetime.tokengetter
def get_rescuetime_token(token=None):
    return session['rescuetime_token']


@app.route("/rescuetime_timechart/<dateStr>")
def rescuetime_timechart(dateStr):
    """
    dateStr is a string with format 'yyyy-MM-dd'
    """
    if 'rescuetime_token' not in session:
        return redirect(url_for("rescuetime_login"))
    else:
        url = "https://www.rescuetime.com/api/oauth/data?access_token={0}&pv=interval&format=json&rb={1}&re={1}".format(
            session['rescuetime_token'], dateStr)
        print url
        response = requests.get(url).json()
        activities = response['rows']
        tc = [{}] * 25
        sumProd = 0
        sumDist = 0
        for i in range(len(tc)):
            tc[i] = {'productive': 0, 'distracting': 0}
        for a in activities:
            k = int(a[0][11:13]) # timestamp as key
            t = a[1] / 60.0   # time spent in minutes
            p = a[5]    # productivity
            if p > 0:
                tc[k]['productive'] += t
                sumProd += t
            elif p == 0:
                tc[k]['productive'] += t / 2.0
                tc[k]['distracting'] += t / 2.0
                sumProd += t / 2.0
                sumDist += t / 2.0
            elif p < 0:
                tc[k]['distracting'] += t
                sumDist += t
        tc[24] = {'totalProductive': sumProd, 'totalDistracting': sumDist}
        return json.dumps(tc)


@app.route("/pastweek")
def pastweek():
    """
    Get the date range from request parameters
    """
    rb = request.args.get('startDate')
    re = request.args.get('endDate')
    url = "https://www.rescuetime.com/api/oauth/productivity_data?access_token={0}&pv=interval&format=json&rb={1}&re={2}&rs=day".format(
            session['rescuetime_token'], rb, re)
    response = requests.get(url).json()
    # generate keys
    start = datetime.strptime(rb, "%Y-%m-%d")
    end = datetime.strptime(re, "%Y-%m-%d")
    step = timedelta(days=1)
    dateLabels = []
    timeSeries = []
    while start <= end:
        dateLabels.append(start.strftime("%Y-%m-%d"))
        timeSeries.append([0,0])
        start += step
    # fill in times
    dailyTimes = response["rows"]
    for row in dailyTimes:
        date = row[0][0:10]
        idx = dateLabels.index(date)
        if row[3] >= 0: # productive time
            timeSeries[idx][0] += row[1] / 60
        else: # distractive time
            timeSeries[idx][1] += row[1] / 60
    return json.dumps({"dateLabels": dateLabels, "timeSeries": timeSeries})



"""
========================================
Fitbit app
1. Oauth authorization
2. Query data
======================================== 
"""
@app.route("/fitbit")
@requires_auth
def fitbit_login():
    # check whether current user has already registered the Fitbit API
    db = get_db()
    res = db.execute('select * from fitbit where uid="{0}";'.format(session['uid']))
    r = res.fetchone()
    if r is None:
        return fitbit.authorize(callback= SERVERNAME+"fitbit_oauth_accept")
    else:
        session["fitbit_token"] = r[1]
        session["fitbit_user_id"] = r[2]
        session["fitbit_refresh_token"] = r[3]
        return json.dumps(r)


@app.route("/fitbit_oauth_accept")
@requires_auth
def fitbit_oauth_accept():
    res = fitbit.authorized_response()
    if res is None:
        return "Access denied. reason: {0}".format(request.args['errors'])
    else:
        session["fitbit_token"] = res["access_token"]
        session["fitbit_user_id"] = res["user_id"]
        session["fitbit_refresh_token"] = res["refresh_token"]
        db = get_db()
        db.execute('insert into fitbit (uid, fitbit_token, fitbit_user_id, \
                fitbit_refresh_token) values ("{0}", "{1}", "{2}", "{3}");'.format(
                    session['uid'], res['access_token'], res['user_id'], res['refresh_token']))
        db.commit()
        return json.dumps(res)
        

@app.route("/fitbit_activity/<dateStr>")
def get_user_activity(dateStr):
    """
    Get user activities.
    
    User id is stored in the session variable.
    date is a string with format 'yyyy-MM-dd'
    """
    if 'fitbit_token' not in session:
        return redirect(url_for("fitbit_login"))
    else:
        url = "https://api.fitbit.com/1/user/{0}/activities/steps/date/{1}/1d/15min.json".format(
            session['fitbit_user_id'], dateStr)
        header = {"Authorization":"Bearer {0}".format(session['fitbit_token'])}
        res = requests.get(url, headers=header)
        resObj = json.loads(res.content)
        if resObj.get('errors') and resObj.get('errors')[0].get('errorType') == 'expired_token':
            refresh_fitbit_token()
            return get_user_activity(dateStr)
        else:
            # generate hourly time series from resObj
            steps = int(resObj['activities-steps'][0]['value'])
            intraday = resObj['activities-steps-intraday']['dataset']
            ts = [0] * 24
            for t in intraday:
                h = int(t['time'][0:2])
                ts[h] += t['value']
            return json.dumps([steps, ts])
        
        
@fitbit.tokengetter
def get_fitbit_token(token=None):
    print "call fitbit tokengetter", session.get('fitbit_token')
    return session.get('fitbit_token')
    
    
def refresh_fitbit_token():
    print "refresh_fitbit_token"
    refresh_request_data = {'grant_type': 'refresh_token',
                            'refresh_token': session['fitbit_refresh_token'],
                            'expires_in': 28800
                            }
    header = authorizationHeader()
    resp = requests.post(fitbit.access_token_url, data=refresh_request_data, headers=header)
    r = resp.json()
    session['fitbit_token'] = r['access_token']
    session['fitbit_user_id'] = r['user_id']
    session['fitbit_refresh_token'] = r['refresh_token']
    # update fitbit credentials in local DB
    db = get_db()
    db.execute('update fitbit set fitbit_token="{0}", fitbit_user_id="{1}", fitbit_refresh_token="{2}" where uid="{3}";'.format(
               r['access_token'], r['user_id'], r['refresh_token'], session['uid']))
    db.commit()
    return resp
    


"""
========================================
Survey
1. Update survey data into database
2. past week line graph
======================================== 
"""    
@app.route("/track_survey", methods=['POST'])
@requires_auth
def track_survey():
    print session["uid"], "finished at", strftime("%Y-%m-%d %H:%M:%S", gmtime())
    now = request.form.get("submit_date")
    # survey questions
    comments = request.form['comments']
    step = request.form.get("step")
    alcohol = request.form.get("alcohol")
    cigarette = request.form.get("cigarette")
    sleep = request.form.get("sleep")
    percent_academic = request.form.get("percent_academic")
    percent_social = request.form.get("percent_social")
    percent_personal = request.form.get("percent_personal")
    other_name = request.form.get("other_name")
    percent_other = request.form.get("percent_other")
    feedback = request.form.get("feedback")

    what_happen = request.form.get('what_happen')
    code = request.form.get("code")
    time_began = request.form.get("time_began")
    time_end = request.form.get("time_end")
    where_happen = request.form.get("where_happen")
    feel = request.form.get("feel")
    stress = request.form.get("stress")

    try:
        db = get_db()
        db.execute('insert into auto_track_survey ( uid, submit_date, comments, step, alcohol, cigarette, sleep, percent_academic, percent_social, percent_personal, other_name, percent_other, feedback) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?); ', (session['uid'], now, comments, step, alcohol, cigarette, sleep, percent_academic, percent_social, percent_personal, other_name, percent_other, feedback) )

        db.execute('insert into auto_track_entry ( uid, submit_date, what_happen, code, time_began, time_end, where_happen, feel, stress) values (?, ?, ?, ?, ?, ?, ?, ?, ?); ', (session['uid'], now, what_happen, code, time_began, time_end, where_happen, feel, stress) )

        for i in range(1, 24):
             # self-tracking
            what_happen = request.form.get('what_happen' + str(i+1))
            code = request.form.get("code" + str(i+1))
            time_began = request.form.get("time_began" + str(i+1))
            time_end = request.form.get("time_end" + str(i+1))
            where_happen = request.form.get("where_happen" + str(i+1))
            feel = request.form.get("feel" + str(i+1))
            stress = request.form.get("stress" + str(i+1))
            db.execute('insert into auto_track_entry ( uid, submit_date, what_happen, code, time_began, time_end, where_happen, feel, stress) values (?, ?, ?, ?, ?, ?, ?, ?, ?); ', (session['uid'], now, what_happen, code, time_began, time_end, where_happen, feel, stress) )

        db.commit()
        return "Submit successfully. Thank you!"
    except sqlite3.Error as er:
        return er.message


@app.route("/pastweek_survey")
@requires_auth
def past_week_survey_linegraph():
    rb = request.args.get('startDate')
    re = request.args.get('endDate')

    start = datetime.strptime(rb, "%Y-%m-%d")
    end = datetime.strptime(re, "%Y-%m-%d")
    step = timedelta(days=1)
    dateLabels = []
    timeSeries = []
        
    try:
        db = get_db()
        while start <= end:
            curDate = start.strftime("%Y-%m-%d")
            dateLabels.append(curDate)
            start += step
            res = db.execute("select percent_academic, percent_social, percent_personal from auto_track_survey where uid=? and submit_date=?", (session['uid'], curDate))
            r = res.fetchone()
            if r is None:
                timeSeries.append([0,0,0])
            else:
                timeSeries.append([float(i) if i else 0 for i in r])
            
        return json.dumps({"dateLabels": dateLabels, "timeSeries": timeSeries})
    except sqlite3.Error as er:
        return er.message


####################################################################


# manual tracking
@app.route("/user_register_manual", methods=['POST'])
def user_register_manual():
    user_manual = request.form.get("name")
    password_manual = request.form.get("password")
    try:
        db = get_db()
        db.execute('insert into users_manual (name, password) values ("{0}", "{1}");'.format(user_manual, password_manual))
        db.commit()
        return login_manual("Register successfully. Please login.")
    except sqlite3.Error as er:
        return login_manual(er.message)


@app.route("/check_auth_manual", methods=['POST'])    
def check_auth_manual():
    """
    Authenticate the login credential.
    
    If valid, login user and get Oauth tokens for Moves, Rescuetime.
    Otherwise, redirect to login page and ask user to retry.
    """
    user_manual = request.form.get("name")
    password_manual = request.form.get("password")
    db = get_db()
    res = db.execute('select userid from users_manual where name="{0}" and password="{1}"; '.format(user_manual, password_manual))
    r = res.fetchall()
    if len(r) == 1:
        session['uid'] = r[0][0]
        session['uname'] = user_manual
        # # get Oauth login credentials
        # moves_login()
        # rescuetime_login()
        # fitbit_login()
        return redirect(url_for("index_manual"))
    else:
        return login_manual("Wrong username or password. Please try again.")

def requires_auth_manual(f):
    """
    My decorator for login check.
    
    If the session['uid'] exists, then the user is logged in.
    Otherwise, redirect user to login page.
    """
    @wraps(f)
    def wrapper(*args, **kwds):
        if 'uid' not in session:
            return login_manual("You are not logged in yet. Please log in")
        return f(*args, **kwds)
    return wrapper        

@app.route("/login_b")
def login_manual(message=""):
    return render_template("login_manual.html", message=message)

@app.route("/home_b")
@requires_auth_manual
def index_manual():
    return render_template("manual_tracking.html")


@app.route("/logout_manual")
@requires_auth_manual
def logout_manual():
    session.clear()
    return login_manual("You have successfully logged out!")

@app.route("/track_survey_b", methods=['POST'])
@requires_auth_manual
def track_survey_manual():
    # survey questions
    comments = request.form['comments']
    step = request.form.get("step")
    alcohol = request.form.get("alcohol")
    cigarette = request.form.get("cigarette")
    sleep = request.form.get("sleep")
    percent_academic = request.form.get("percent_academic")
    percent_social = request.form.get("percent_social")
    percent_personal = request.form.get("percent_personal")
    other_name = request.form.get("other_name")
    percent_other = request.form.get("percent_other")

    now = request.form.get("submit_date")

    what_happen = request.form.get('what_happen')
    code = request.form.get("code")
    time_began = request.form.get("time_began")
    time_end = request.form.get("time_end")
    where_happen = request.form.get("where_happen")
    feel = request.form.get("feel")
    stress = request.form.get("stress")

    try:
        db = get_db()
        db.execute('insert into manual_track_survey ( uid, submit_date, comments, step, alcohol, cigarette, sleep, percent_academic, percent_social, percent_personal, other_name, percent_other) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?); ', (session['uid'], now, comments, step, alcohol, cigarette, sleep, percent_academic, percent_social, percent_personal, other_name, percent_other) )

        db.execute('insert into manual_track_entry ( uid, submit_date, what_happen, code, time_began, time_end, where_happen, feel, stress) values (?, ?, ?, ?, ?, ?, ?, ?, ?); ', (session['uid'], now, what_happen, code, time_began, time_end, where_happen, feel, stress) )

        for i in range(1, 24):
             # self-tracking
            what_happen = request.form.get('what_happen' + str(i+1))
            code = request.form.get("code" + str(i+1))
            time_began = request.form.get("time_began" + str(i+1))
            time_end = request.form.get("time_end" + str(i+1))
            where_happen = request.form.get("where_happen" + str(i+1))
            feel = request.form.get("feel" + str(i+1))
            stress = request.form.get("stress" + str(i+1))
            db.execute('insert into manual_track_entry ( uid, submit_date, what_happen, code, time_began, time_end, where_happen, feel, stress) values (?, ?, ?, ?, ?, ?, ?, ?, ?); ', (session['uid'], now, what_happen, code, time_began, time_end, where_happen, feel, stress) )

        db.commit()
        return "Submit successfully. Thank you."
    except sqlite3.Error as er:
        return er.message



"""
========================================
Server utility, cleanup etc.
======================================== 
"""

@app.teardown_appcontext
def close_db_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()




if __name__ == '__main__':
#    app.run(debug=True)
    app.run(host="0.0.0.0", port=8081, debug=True, ssl_context=context)
